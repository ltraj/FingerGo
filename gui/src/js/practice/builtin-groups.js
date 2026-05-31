// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Built-in targeted practice groups derived from keyboard layouts.
 */
(() => {
    const HOME_ROW_KEYS = new Set(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';']);
    const NUMBER_KEYS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    const PUNCTUATION_KEYS = new Set([';', "'", ',', '.', '/']);
    const MODIFIER_KEYS = new Set([
        'Tab',
        'CapsLock',
        'Shift',
        'Control',
        'Alt',
        'Meta',
        'Backspace',
        'Enter',
    ]);

    function uniqueSorted(keys) {
        return [...new Set(keys)].sort((a, b) => a.localeCompare(b));
    }

    function keysFromFingerMap(layout, predicate) {
        if (!layout?.fingerMap) return [];
        return uniqueSorted(
            Object.entries(layout.fingerMap)
                .filter(([key, finger]) => predicate(key, finger))
                .map(([key]) => key),
        );
    }

    function resolveTopRow(layout) {
        return keysFromFingerMap(
            layout,
            (key, finger) =>
                NUMBER_KEYS.has(key) ||
                (key.length === 1 &&
                    key >= 'q' &&
                    key <= 'p' &&
                    typeof finger === 'string' &&
                    finger.includes('index')),
        );
    }

    function resolveBottomRow(layout) {
        return keysFromFingerMap(
            layout,
            (key, finger) =>
                (key.length === 1 && key >= 'z' && key <= 'm' && typeof finger === 'string') ||
                (PUNCTUATION_KEYS.has(key) && finger?.startsWith?.('right')),
        );
    }

    function resolveSymbols(layout) {
        const symbols = keysFromFingerMap(
            layout,
            (key, finger) =>
                key.length === 1 &&
                !NUMBER_KEYS.has(key) &&
                !HOME_ROW_KEYS.has(key) &&
                !PUNCTUATION_KEYS.has(key) &&
                key !== ' ' &&
                !MODIFIER_KEYS.has(key) &&
                (layout.shiftToBaseKey?.[key] !== undefined ||
                    (finger && !finger.includes('pinky') && key === key.toUpperCase())),
        );
        if (layout.shiftToBaseKey) {
            Object.keys(layout.shiftToBaseKey).forEach(sym => {
                if (!symbols.includes(sym)) symbols.push(sym);
            });
        }
        return uniqueSorted(symbols);
    }

    const BUILTIN_DEFS = [
        {
            id: 'builtin-home-row',
            name: 'Home row',
            resolve: () => uniqueSorted([...HOME_ROW_KEYS]),
        },
        {
            id: 'builtin-left-hand',
            name: 'Left hand',
            resolve: layout =>
                keysFromFingerMap(layout, (_, finger) => finger?.startsWith?.('left-')),
        },
        {
            id: 'builtin-right-hand',
            name: 'Right hand',
            resolve: layout =>
                keysFromFingerMap(layout, (_, finger) => finger?.startsWith?.('right-')),
        },
        { id: 'builtin-top-row', name: 'Top row', resolve: resolveTopRow },
        { id: 'builtin-bottom-row', name: 'Bottom row', resolve: resolveBottomRow },
        {
            id: 'builtin-numbers',
            name: 'Numbers',
            resolve: layout => keysFromFingerMap(layout, key => NUMBER_KEYS.has(key)),
        },
        {
            id: 'builtin-punctuation',
            name: 'Punctuation',
            resolve: layout => keysFromFingerMap(layout, key => PUNCTUATION_KEYS.has(key)),
        },
        { id: 'builtin-symbols', name: 'Symbols', resolve: resolveSymbols },
    ];

    /**
     * @param {string} [layoutId]
     * @returns {Array<{id: string, name: string, layoutId: string, keys: string[], source: string}>}
     */
    function getBuiltinGroups(layoutId) {
        const layout =
            window.KeyboardLayouts?.getLayout?.(layoutId) ||
            window.KeyboardLayouts?.getDefaultLayout?.();
        const id = layout?.id || layoutId || 'en-qwerty';
        return BUILTIN_DEFS.map(def => {
            const keys = def.resolve(layout || { fingerMap: {} });
            return {
                id: def.id,
                name: def.name,
                layoutId: id,
                keys,
                source: 'builtin',
            };
        }).filter(g => g.keys.length > 0);
    }

    /**
     * @param {string} groupId
     * @param {string} [layoutId]
     */
    function getBuiltinGroup(groupId, layoutId) {
        return getBuiltinGroups(layoutId).find(g => g.id === groupId) || null;
    }

    window.BuiltinPracticeGroups = {
        getBuiltinGroups,
        getBuiltinGroup,
    };
})();
