(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TuzInventoryManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ACTION_WORD_RE = /(폐기|버려|버리|빼줘|빼|제거|삭제|차감)/i;
  const BROAD_CHANGE_RE = /(^|\s)(정리|처리)\s*(해|해줘|줘|할래|하자)?\s*$/i;
  const DISPOSAL_CONTEXT_RE = /(폐기|버릴|버려|유통기한|소비기한|기한|지난|초과|만료|상한|상했|상함|이상|찝찝|오늘\s*정리|오늘\s*처리|정리할|처리할)/i;
  const SPOILAGE_RE = /(상한|상했|상함|이상|찝찝|냄새|변색|곰팡|상태\s*이상)/i;
  const EXPIRED_RE = /(유통기한|소비기한|기한|지난|초과|만료|폐기해야|폐기\s*(처리\s*)?해야|처리\s*해야)/i;
  const TODAY_RE = /(오늘|마감|먼저|우선|급한|처리할|정리할)/i;
  const ALL_RE = /(다|전부|모두|전체|싹|전량)/i;
  const READ_ONLY_RE = /(목록|리스트|후보|보여|알려|찾아|조회|있어|뭐|어떤|확인|확인만|보기만)/i;
  const LOW_STOCK_RE = /(부족|떨어질|떨어져|모자라|최소|발주|주문|사야|low\s*stock)/i;
  const EXCESS_STOCK_RE = /(많이\s*남|많은\s*재고|과잉|넘치|쌓인|남는|excess|overstock)/i;
  const GENERIC_TARGET_RE = /(폐기\s*(처리\s*)?해야\s*할\s*(거|것|목록|리스트)?|처리\s*해야\s*할\s*(거|것|목록|리스트)|폐기할\s*(거|것|목록|리스트)?|버릴\s*(거|것|목록|리스트)?|유통기한\s*지난\s*(거|것|목록|리스트)?|기한\s*지난\s*(거|것|목록|리스트)?|지난\s*(거|것|목록|리스트)|만료된\s*(거|것|목록|리스트)?|오늘\s*(정리|처리)할\s*(거|것|목록|리스트)?|정리할\s*(거|것|목록|리스트)?|처리할\s*(거|것|목록|리스트)?)/i;
  const VAGUE_RE = /(이상한\s*(거|것)|문제\s*있는\s*(거|것)|찝찝한\s*(거|것)|뭔가\s*이상)/i;

  const STOP_WORDS_RE = /(하동이|쿠키|매니저|재고|품목|수량|개수|현재|좀|제발|바로|오늘|마감|목록|리스트|후보|보여줘|보여|알려줘|알려|확인해줘|확인|조회|찾아줘|찾아|정리할|처리할|정리|처리|폐기\s*(처리\s*)?해야\s*할|처리\s*해야\s*할|해야\s*할|폐기할|폐기|버릴|버려|버리|빼줘|빼|제거|삭제|해줘|줘|해|다|전부|모두|전체|전량|상한|상했|상함|이상한|이상|유통기한|소비기한|기한|지난|초과|만료|거|것)/gi;

  function todayIso(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[()[\]{}"'`~!@#$%^&*_+=|\\:;,.?/<>\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compactText(value) {
    return normalizeText(value).replace(/\s+/g, '');
  }

  function ddayFromDate(expiryDate, baseIso = todayIso()) {
    if (!expiryDate) return null;
    const base = new Date(`${baseIso}T00:00:00`);
    const expiry = new Date(`${expiryDate}T00:00:00`);
    if (Number.isNaN(base.getTime()) || Number.isNaN(expiry.getTime())) return null;
    return Math.round((expiry - base) / 86400000);
  }

  function ddayLabel(dday) {
    if (dday === null || dday === undefined) return '기한 미입력';
    if (dday < 0) return `D+${Math.abs(dday)} 초과`;
    if (dday === 0) return '오늘 마감';
    return `${dday}일 남음`;
  }

  function parseAmount(message) {
    const text = normalizeText(message);
    const numeric = text.match(/(\d+(?:\.\d+)?)\s*(개|병|팩|통|봉|kg|g|ml|l|리터|잔|장|박스|포대)?/i);
    if (numeric) {
      const value = Number(numeric[1]);
      if (Number.isFinite(value) && value > 0) {
        return { value, unit: numeric[2] || '' };
      }
    }

    const koreanNumbers = {
      한: 1, 하나: 1, 한개: 1,
      두: 2, 둘: 2, 두개: 2,
      세: 3, 셋: 3, 세개: 3,
      네: 4, 넷: 4, 네개: 4,
      다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10
    };
    const wordNumber = text.match(/(?:^|\s)(한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열)\s*(개|병|팩|통|봉|잔|장)?(?=\s|$)/);
    return wordNumber ? { value: koreanNumbers[wordNumber[1]], unit: wordNumber[2] || '' } : null;
  }

  function stripAmount(value) {
    return normalizeText(value)
      .replace(/\d+(?:\.\d+)?\s*(개|병|팩|통|봉|kg|g|ml|l|리터|잔|장|박스|포대)?/gi, ' ')
      .replace(/(^|\s)(한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열)\s*(개|병|팩|통|봉|잔|장)?(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractItemQuery(message) {
    const cleaned = stripAmount(message)
      .replace(GENERIC_TARGET_RE, ' ')
      .replace(STOP_WORDS_RE, ' ')
      .replace(/\s*(을|를|이|가|은|는|만|도|로|으로)$/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned;
  }

  function isMarkedForDisposal(item) {
    const text = normalizeText([
      item.status,
      item.memo,
      item.note,
      item.notes,
      Array.isArray(item.tags) ? item.tags.join(' ') : item.tags
    ].filter(Boolean).join(' '));
    return /폐기|버릴|상함|상한|이상|discard|dispose/.test(text);
  }

  function itemSearchText(item) {
    return normalizeText([
      item.name,
      item.category,
      item.storage_method,
      item.origin
    ].filter(Boolean).join(' '));
  }

  function findInventoryMatches(items, query) {
    const cleaned = normalizeText(query);
    if (!cleaned) return [];
    const compactNeedle = compactText(cleaned);
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    return (items || [])
      .map(item => {
        const name = normalizeText(item.name);
        const text = itemSearchText(item);
        const compactName = compactText(item.name);
        const compactAll = compactText(text);
        let score = 0;
        if (name === cleaned || compactName === compactNeedle) score = 100;
        else if (name.startsWith(cleaned) || compactName.startsWith(compactNeedle)) score = 88;
        else if (name.includes(cleaned) || compactName.includes(compactNeedle)) score = 76;
        else if (compactAll.includes(compactNeedle)) score = 64;
        else if (tokens.length && tokens.every(token => text.includes(token) || compactAll.includes(compactText(token)))) score = 52;
        else if (tokens.length && tokens.some(token => token.length >= 2 && (text.includes(token) || compactAll.includes(compactText(token))))) score = 30;
        return { item, score };
      })
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score || String(a.item.name || '').length - String(b.item.name || '').length)
      .map(row => row.item);
  }

  function inventoryStockKey(item) {
    if (item?.stock_group) return `group:${normalizeText(item.stock_group)}`;
    return [
      normalizeText(item?.name),
      normalizeText(item?.unit || '개'),
      normalizeText(item?.category),
      normalizeText(item?.storage_method)
    ].join('|');
  }

  function inventoryStockSummary(targetItem, sourceItems = []) {
    const key = inventoryStockKey(targetItem);
    const lots = (sourceItems || []).filter(item => inventoryStockKey(item) === key);
    const totalQuantity = lots.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const minQuantity = lots.reduce((max, item) => {
      const raw = item.min_quantity ?? item.minQuantity;
      const value = raw === null || raw === undefined || raw === '' ? null : Number(raw);
      if (!Number.isFinite(value)) return max;
      return max === null ? value : Math.max(max, value);
    }, null);
    return {
      key,
      item: targetItem,
      lots,
      totalQuantity: Number(totalQuantity.toFixed(3)),
      minQuantity,
      low: minQuantity !== null && totalQuantity < minQuantity
    };
  }

  function lowStockRows(rows) {
    const sourceItems = (rows || []).map(row => row.source);
    const seen = new Set();
    return (rows || [])
      .map(row => {
        const summary = inventoryStockSummary(row.source, sourceItems);
        if (seen.has(summary.key)) return null;
        seen.add(summary.key);
        return summary.low ? { row, summary } : null;
      })
      .filter(Boolean)
      .sort((a, b) =>
        (a.summary.totalQuantity - a.summary.minQuantity) - (b.summary.totalQuantity - b.summary.minQuantity) ||
        String(a.row.name || '').localeCompare(String(b.row.name || ''), 'ko')
      )
      .map(entry => entry.row);
  }

  function enrichItem(item, baseIso = todayIso()) {
    const quantity = Number(item.quantity) || 0;
    const expiryDate = item.expiry_date || item.expiryDate || null;
    const dday = ddayFromDate(expiryDate, baseIso);
    const expired = dday !== null && dday < 0;
    const today = dday === 0;
    const marked = isMarkedForDisposal(item);
    return {
      id: item.id,
      name: String(item.name || ''),
      quantity,
      unit: item.unit || '개',
      category: item.category || '',
      expiryDate,
      expiryType: item.expiry_type || item.expiryType || 'SELL-BY',
      dday,
      ddayLabel: ddayLabel(dday),
      expired,
      today,
      markedForDisposal: marked,
      source: item
    };
  }

  function candidateFromItem(row, reason, actionKind = 'remove', actionQuantity = null) {
    return {
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      expiryDate: row.expiryDate,
      dday: row.dday,
      ddayLabel: row.ddayLabel,
      reason,
      actionKind,
      actionQuantity
    };
  }

  function parseManagerIntent(message) {
    const text = normalizeText(message);
    const compact = compactText(message);
    const amount = parseAmount(message);
    const explicitAction = ACTION_WORD_RE.test(text);
    const disposalContext = DISPOSAL_CONTEXT_RE.test(text);
    const genericTarget = GENERIC_TARGET_RE.test(text) || GENERIC_TARGET_RE.test(compact);
    const vague = VAGUE_RE.test(text);
    const readOnly = READ_ONLY_RE.test(text);
    const broadChange = BROAD_CHANGE_RE.test(text);
    const query = extractItemQuery(text);

    if (vague) {
      return {
        intent: 'ask_clarification',
        operation: 'clarify_disposal_criteria',
        confidence: 0.72,
        criteria: { vague: true },
        query,
        amount
      };
    }

    if (LOW_STOCK_RE.test(text)) {
      return {
        intent: 'low_stock_report',
        operation: 'brief',
        confidence: 0.84,
        criteria: { lowStock: true, readOnly: true },
        query,
        amount: null
      };
    }

    if (EXCESS_STOCK_RE.test(text)) {
      return {
        intent: 'excess_stock_report',
        operation: 'brief',
        confidence: 0.76,
        criteria: { excessStock: true, readOnly: true },
        query,
        amount: null
      };
    }

    if (readOnly && TODAY_RE.test(text) && !EXPIRED_RE.test(text) && !SPOILAGE_RE.test(text) && !/폐기|버릴|버려|만료|초과|지난/.test(text)) {
      return {
        intent: 'brief_today',
        operation: 'brief',
        confidence: 0.84,
        criteria: { today: true, expired: true, readOnly: true },
        query,
        amount: null
      };
    }

    if (broadChange && !ACTION_WORD_RE.test(text) && !EXPIRED_RE.test(text) && !SPOILAGE_RE.test(text)) {
      return {
        intent: 'ask_clarification',
        operation: 'clarify_work_scope',
        confidence: 0.74,
        criteria: { broadAction: true },
        query,
        amount
      };
    }

    if ((explicitAction || readOnly) && disposalContext) {
      return {
        intent: genericTarget || !query ? 'dispose_candidates' : 'dispose_named_item',
        operation: readOnly ? 'brief' : 'dispose',
        confidence: genericTarget || query ? 0.86 : 0.7,
        criteria: {
          expired: EXPIRED_RE.test(text) || genericTarget,
          markedForDisposal: /폐기|버릴|버려|폐기해야/.test(text) || genericTarget,
          spoiled: SPOILAGE_RE.test(text),
          today: TODAY_RE.test(text),
          all: ALL_RE.test(text) || genericTarget,
          explicitAction,
          readOnly
        },
        query,
        amount
      };
    }

    if (TODAY_RE.test(text) && /(있|보여|알려|뭐|목록|재고|할\s*일|정리할|처리할)/i.test(text)) {
      return {
        intent: 'brief_today',
        operation: 'brief',
        confidence: 0.82,
        criteria: { today: true, expired: true },
        query,
        amount: null
      };
    }

    return {
      intent: 'unknown',
      operation: 'none',
      confidence: 0,
      criteria: {},
      query,
      amount
    };
  }

  function buildEmptyDisposalReply(intent, rows) {
    const missingExpiryCount = rows.filter(row => !row.expiryDate && row.quantity > 0).length;
    if (missingExpiryCount) {
      return `폐기 기준으로 볼 날짜 정보가 없는 재고가 ${missingExpiryCount}개 있다멍. 자동 처리는 보류했다멍.\n기한을 먼저 입력하거나, 품목을 찍어서 폐기할지 확인해달라멍.`;
    }
    if (intent.criteria?.spoiled) {
      return '상한 상태는 현재 재고 데이터만으로 확정하기 어렵다멍. 냄새나 색처럼 현장 확인 기준을 알려주면 후보를 다시 좁혀보겠다멍.';
    }
    return '재고 목록을 확인했는데, 지금 자동 폐기할 기한 초과/폐기 예정 재고는 없다멍.';
  }

  function buildManagerActionPlanRaw(message, items, options = {}) {
    const baseIso = options.todayIso || todayIso(options.now || new Date());
    const intent = parseManagerIntent(message);
    const rows = (items || []).map(item => enrichItem(item, baseIso));
    const inStockRows = rows.filter(row => row.quantity > 0);

    if (intent.intent === 'unknown') return null;

    if (intent.intent === 'ask_clarification') {
      const reply = intent.criteria?.broadAction
        ? '정리/처리는 범위가 넓어서 바로 바꾸지 않겠다멍. 유통기한 지난 것, 부족 재고, 특정 품목/수량 중 무엇을 처리할지 골라달라멍.'
        : '무엇을 “이상한 거”로 볼지 기준이 더 필요하다멍. 유통기한 지난 것, 상한 것으로 확인한 것, 오늘 마감 중에서 골라달라멍.';
      return {
        source: 'local',
        intent: intent.intent,
        operation: intent.operation,
        confidence: intent.confidence,
        requiresConfirmation: true,
        execution: 'ask',
        criteria: intent.criteria,
        candidates: [],
        reply
      };
    }

    if (intent.intent === 'low_stock_report') {
      const low = lowStockRows(inStockRows);
      return {
        source: 'local',
        intent: intent.intent,
        operation: 'brief',
        confidence: intent.confidence,
        requiresConfirmation: false,
        execution: 'reply',
        criteria: intent.criteria,
        candidates: low.map(row => candidateFromItem(row, '부족 재고', 'inspect', null)),
        reply: low.length
          ? `부족 재고 ${low.length}개를 찾았다멍. 아직 수량은 바꾸지 않고 목록만 보여준다멍.`
          : '부족 기준에 걸린 재고는 없다멍.'
      };
    }

    if (intent.intent === 'excess_stock_report') {
      const excess = inStockRows
        .filter(row => {
          const minQuantity = row.source.min_quantity ?? row.source.minQuantity;
          return minQuantity != null
            ? Number(row.source.quantity) >= Math.max(Number(minQuantity) * 2, Number(minQuantity) + 5)
            : Number(row.source.quantity) >= 10;
        })
        .sort((a, b) => Number(b.source.quantity || 0) - Number(a.source.quantity || 0))
        .slice(0, 8);
      return {
        source: 'local',
        intent: intent.intent,
        operation: 'brief',
        confidence: intent.confidence,
        requiresConfirmation: false,
        execution: 'reply',
        criteria: intent.criteria,
        candidates: excess.map(row => candidateFromItem(row, '많이 남은 재고', 'inspect', null)),
        reply: excess.length
          ? `많이 남은 재고 후보 ${excess.length}개를 찾았다멍. 처리하지 않고 목록만 보여준다멍.`
          : '많이 남은 것으로 볼 재고는 뚜렷하지 않다멍.'
      };
    }

    if (intent.intent === 'brief_today') {
      const expired = inStockRows.filter(row => row.expired);
      const today = inStockRows.filter(row => row.today);
      const low = lowStockRows(inStockRows);
      return {
        source: 'local',
        intent: intent.intent,
        operation: 'brief',
        confidence: intent.confidence,
        requiresConfirmation: false,
        execution: 'reply',
        criteria: intent.criteria,
        candidates: [
          ...expired.map(row => candidateFromItem(row, '기한 초과')),
          ...today.filter(row => !expired.some(expiredRow => expiredRow.id === row.id)).map(row => candidateFromItem(row, '오늘 마감')),
          ...low.filter(row => !expired.some(expiredRow => expiredRow.id === row.id) && !today.some(todayRow => todayRow.id === row.id)).map(row => candidateFromItem(row, '부족 재고'))
        ],
        reply: `오늘 정리할 재고를 확인했다멍. 기한 초과 ${expired.length}개, 오늘 마감 ${today.length}개, 부족 재고 ${low.length}개다멍.`
      };
    }

    const query = intent.query;
    const matches = query ? findInventoryMatches(items, query).map(item => enrichItem(item, baseIso)) : [];
    const expiredOrMarked = inStockRows.filter(row => row.expired || row.markedForDisposal);

    if (intent.intent === 'dispose_named_item') {
      if (!matches.length) {
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.58,
          requiresConfirmation: true,
          execution: 'ask',
          criteria: intent.criteria,
          query,
          candidates: [],
          reply: `"${query}"로 볼 만한 재고를 찾지 못했다멍. 그래도 폐기 기준은 확인했다멍. 품목을 다시 찍어주거나 기한 초과 목록에서 처리할지 골라달라멍.`
        };
      }

      const topMatches = matches.slice(0, 5);
      if (topMatches.length > 1 && topMatches[0].name !== query) {
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.66,
          requiresConfirmation: true,
          execution: 'confirm',
          criteria: intent.criteria,
          query,
          candidates: topMatches.map(row => candidateFromItem(row, intent.criteria.spoiled ? '상한 것으로 입력됨' : '이름 유사 후보', intent.amount ? 'decrement' : 'remove', intent.amount?.value || null)),
          reply: `폐기 후보가 ${topMatches.length}개 있다멍. 어떤 품목을 처리할지 확인이 필요하다멍.`
        };
      }

      const row = topMatches[0];
      if (intent.amount?.value) {
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.9,
          requiresConfirmation: false,
          execution: 'auto',
          criteria: intent.criteria,
          query,
          candidates: [candidateFromItem(row, '명시 수량 폐기', 'decrement', Math.min(intent.amount.value, row.quantity))],
          reply: `${row.name} ${Math.min(intent.amount.value, row.quantity)}${row.unit}를 폐기 수량으로 처리한다멍.`
        };
      }

      if (row.expired || row.markedForDisposal) {
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.9,
          requiresConfirmation: false,
          execution: 'auto',
          criteria: intent.criteria,
          query,
          candidates: [candidateFromItem(row, row.expired ? '기한 초과' : '폐기 예정 표시')],
          reply: `${row.name}은 ${row.expired ? row.ddayLabel : '폐기 예정 표시'}라 전량 폐기 처리한다멍.`
        };
      }

      return {
        source: 'local',
        intent: intent.intent,
        operation: 'dispose',
        confidence: intent.criteria.spoiled ? 0.78 : 0.68,
        requiresConfirmation: true,
        execution: 'confirm',
        criteria: intent.criteria,
        query,
        candidates: [candidateFromItem(row, intent.criteria.spoiled ? '상한 것으로 입력됨' : '전량 폐기 확인 필요')],
        reply: intent.criteria.spoiled
          ? `${row.name}을 상한 재고로 봤다멍. 데이터만으로 상함을 확정할 수 없어서 전량 폐기 전에 확인이 필요하다멍.`
          : `${row.name}은 기한 초과 표시는 아니다멍. 전량 폐기할지 확인이 필요하다멍.`
      };
    }

    if (intent.intent === 'dispose_candidates') {
      if (intent.criteria?.readOnly) {
        const candidates = expiredOrMarked.map(row => candidateFromItem(row, row.expired ? '기한 초과' : '폐기 예정 표시'));
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'brief',
          confidence: 0.9,
          requiresConfirmation: false,
          execution: 'reply',
          criteria: intent.criteria,
          candidates,
          reply: candidates.length
            ? `폐기 후보 ${candidates.length}개를 찾았다멍. 아직 처리하지 않고 목록만 보여준다멍.`
            : buildEmptyDisposalReply(intent, rows)
        };
      }

      if (intent.criteria.today && !intent.criteria.expired && !intent.criteria.markedForDisposal) {
        const todayRows = inStockRows.filter(row => row.expired || row.today);
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.72,
          requiresConfirmation: true,
          execution: 'confirm',
          criteria: intent.criteria,
          candidates: todayRows.map(row => candidateFromItem(row, row.expired ? '기한 초과' : '오늘 마감')),
          reply: todayRows.length
            ? `오늘 처리 후보가 ${todayRows.length}개 있다멍. 기한 초과는 폐기해도 되지만, 오늘 마감은 사용 여부 확인이 필요하다멍.`
            : buildEmptyDisposalReply(intent, rows)
        };
      }

      if (!expiredOrMarked.length) {
        return {
          source: 'local',
          intent: intent.intent,
          operation: 'dispose',
          confidence: 0.78,
          requiresConfirmation: true,
          execution: 'ask',
          criteria: intent.criteria,
          candidates: [],
          reply: buildEmptyDisposalReply(intent, rows)
        };
      }

      return {
        source: 'local',
        intent: intent.intent,
        operation: 'dispose',
        confidence: 0.93,
        requiresConfirmation: false,
        execution: 'auto',
        criteria: intent.criteria,
        candidates: expiredOrMarked.map(row => candidateFromItem(row, row.expired ? '기한 초과' : '폐기 예정 표시')),
        reply: `폐기 기준에 맞는 재고 ${expiredOrMarked.length}개를 찾았다멍.`
      };
    }

    return null;
  }

  function operationTypeForPlan(plan) {
    if (!plan) return 'none';
    if (plan.execution === 'ask') return 'ask';
    if (['dispose', 'adjust_quantity'].includes(plan.operation)) return 'write';
    return 'read';
  }

  function operationFromCandidate(candidate, plan) {
    const actionKind = candidate.actionKind || 'remove';
    return {
      type: actionKind === 'decrement' ? 'adjust_quantity' : plan.operation || 'inspect_candidates',
      itemId: candidate.id,
      itemName: candidate.name,
      quantity: actionKind === 'decrement' ? Number(candidate.actionQuantity || 0) : Number(candidate.quantity || 0),
      unit: candidate.unit || '개',
      reason: candidate.reason || '',
      mode: actionKind === 'decrement' ? 'decrement' : actionKind
    };
  }

  function finalizePlan(plan) {
    if (!plan) return null;
    const operationType = operationTypeForPlan(plan);
    const action = plan.action || (
      plan.intent === 'low_stock_report' ? 'low_stock_report' :
      plan.intent === 'excess_stock_report' ? 'excess_stock_report' :
      plan.operation === 'dispose' ? 'dispose' :
      plan.operation === 'brief' ? 'inspect_candidates' :
      plan.operation === 'clarify_work_scope' || plan.operation === 'clarify_disposal_criteria' ? 'ask_clarification' :
      'none'
    );
    const candidates = Array.isArray(plan.candidates) ? plan.candidates : [];
    return {
      ...plan,
      operationType,
      action,
      operations: Array.isArray(plan.operations)
        ? plan.operations
        : candidates.map(candidate => operationFromCandidate(candidate, { ...plan, action }))
    };
  }

  function buildManagerActionPlan(message, items, options = {}) {
    return finalizePlan(buildManagerActionPlanRaw(message, items, options));
  }

  function validateActionPlanForExecution(plan, currentItems, options = {}) {
    const finalPlan = finalizePlan(plan);
    if (!finalPlan) return { ok: false, reason: '실행할 작업 계획이 없다멍.' };
    if (finalPlan.operationType !== 'write') {
      return { ok: false, reason: '조회 요청이라 재고를 변경하지 않았다멍.' };
    }
    if (!['dispose', 'adjust_quantity'].includes(finalPlan.action)) {
      return { ok: false, reason: '허용되지 않은 작업이라 재고를 변경하지 않았다멍.' };
    }
    if (finalPlan.criteria?.readOnly) {
      return { ok: false, reason: '목록/확인 요청이라 재고를 변경하지 않았다멍.' };
    }
    if (finalPlan.requiresConfirmation && !options.confirmed) {
      return { ok: false, reason: '확인이 필요한 작업이라 아직 재고를 변경하지 않았다멍.' };
    }
    if (finalPlan.execution === 'confirm' && !options.confirmed) {
      return { ok: false, reason: '확인 버튼을 눌러야 처리할 수 있다멍.' };
    }
    if (finalPlan.execution !== 'auto' && !(finalPlan.execution === 'confirm' && options.confirmed)) {
      return { ok: false, reason: '자동 실행 대상이 아니라 재고를 변경하지 않았다멍.' };
    }
    if (!options.confirmed && Number(finalPlan.confidence || 0) < 0.85) {
      return { ok: false, reason: '판단 확신도가 낮아서 자동 처리를 멈췄다멍.' };
    }

    const candidates = Array.isArray(finalPlan.candidates) ? finalPlan.candidates : [];
    if (!candidates.length) return { ok: false, reason: '처리할 후보가 없다멍.' };

    const rows = (currentItems || []).map(item => enrichItem(item, options.todayIso || todayIso()));
    const rowById = new Map(rows.map(row => [row.id, row]));
    for (const candidate of candidates) {
      const row = rowById.get(candidate.id);
      if (!row) return { ok: false, reason: `${candidate.name || '후보'} 재고를 찾지 못해 멈췄다멍.` };
      if (row.quantity <= 0) return { ok: false, reason: `${row.name} 수량이 0이라 변경하지 않았다멍.` };
      if (candidate.actionKind === 'decrement') {
        const amount = Number(candidate.actionQuantity || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          return { ok: false, reason: `${row.name} 차감 수량이 명확하지 않아 멈췄다멍.` };
        }
        continue;
      }
      if (!options.confirmed && !(row.expired || row.markedForDisposal)) {
        return { ok: false, reason: `${row.name}은 기한 초과/폐기 예정 근거가 없어 자동 폐기하지 않았다멍.` };
      }
    }

    return { ok: true, plan: finalPlan };
  }

  function coerceGeminiActionPlan(geminiPlan, message, items, options = {}) {
    const localPlan = buildManagerActionPlan(message, items, options);
    if (!geminiPlan || typeof geminiPlan !== 'object') return localPlan;
    if (!localPlan) return null;

    const geminiIntent = String(geminiPlan.intent || geminiPlan.operation || '').toLowerCase();
    const compatible = !geminiIntent || geminiIntent.includes(localPlan.intent.split('_')[0]) || geminiIntent.includes(localPlan.operation);
    if (!compatible) return localPlan;

    return {
      ...localPlan,
      source: 'gemini_validated',
      confidence: Math.max(localPlan.confidence || 0, Number(geminiPlan.confidence) || 0),
      gemini: {
        intent: geminiPlan.intent || '',
        criteria: geminiPlan.criteria || {},
        reply: geminiPlan.reply || '',
        requiresConfirmation: Boolean(geminiPlan.requiresConfirmation)
      }
    };
  }

  return {
    todayIso,
    normalizeText,
    compactText,
    ddayFromDate,
    ddayLabel,
    parseAmount,
    extractItemQuery,
    findInventoryMatches,
    parseManagerIntent,
    buildManagerActionPlan,
    validateActionPlanForExecution,
    coerceGeminiActionPlan
  };
});
