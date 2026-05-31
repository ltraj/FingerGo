// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Generates targeted practice text from a set of keys.
 */
(() => {
    const DEFAULT_LENGTH = 300;
    const MIN_LENGTH = 100;
    const MAX_LENGTH = 2000;

    /**
     * @param {number} seed
     * @returns {() => number}
     */
    function createRng(seed) {
        let s = seed >>> 0 || 1;
        return () => {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * @param {() => number} rng
     * @param {string[]} items
     */
    function pick(rng, items) {
        if (!items.length) return '';
        return items[Math.floor(rng() * items.length)];
    }

    /**
     * @param {string[]} targetKeys
     */
    function buildAllowedChars(targetKeys) {
        const letters = [];
        let allowSpace = false;
        for (const k of targetKeys || []) {
            if (k === ' ') {
                allowSpace = true;
                continue;
            }
            if (k.length === 1) letters.push(k.toLowerCase());
        }
        return { letters: [...new Set(letters)], allowSpace };
    }

    /**
     * @param {string} word
     * @param {Set<string>} allowed
     */
    function wordUsesOnlyAllowed(word, allowed) {
        for (const ch of word.toLowerCase()) {
            if (ch >= 'a' && ch <= 'z' && !allowed.has(ch)) return false;
            if (ch >= '0' && ch <= '9' && !allowed.has(ch)) return false;
        }
        return true;
    }

    /**
     * @param {string[]} targetKeys
     */
    function countTargetChars(text, targetKeys) {
        const set = new Set(targetKeys.map(k => (k === ' ' ? ' ' : k.toLowerCase())));
        let hits = 0;
        for (const ch of text) {
            const c = ch === ' ' ? ' ' : ch.toLowerCase();
            if (set.has(c)) hits++;
        }
        return hits;
    }

    /**
     * @param {string[]} targetKeys
     * @param {() => number} rng
     */
    function buildEmphasisChunk(targetKeys, rng) {
        const pool = targetKeys.filter(k => k && k !== 'Enter' && k !== 'Tab' && k !== ' ');
        const key = pick(rng, pool.length ? pool : ['a']);
        if (!key) return '   ';
        if (key.length === 1) {
            const rep = 2 + Math.floor(rng() * 2);
            return `${key.repeat(rep)} `;
        }
        return `${key} `;
    }

    /**
     * Build pseudo-words using only allowed characters.
     * @param {{ letters: string[] }} allowed
     * @param {() => number} rng
     */
    function randomChunk(allowed, rng) {
        if (!allowed.letters.length) return '';
        const len = 3 + Math.floor(rng() * 4);
        let s = '';
        for (let i = 0; i < len; i++) s += pick(rng, allowed.letters);
        return s;
    }

    /**
     * Words built only from the target key set (home row, numbers, etc.).
     */
    function generateConstrainedWords(options, rng) {
        const { letters, allowSpace } = buildAllowedChars(options.targetKeys);
        const allowedSet = new Set(letters);
        const dict = window.PracticeWordlistEN || [];
        const exclusive = dict.filter(w => w && wordUsesOnlyAllowed(w, allowedSet));
        const pool = exclusive.length >= 8 ? exclusive : null;
        let text = '';
        const targetLen = options.length || DEFAULT_LENGTH;

        while (text.length < targetLen) {
            const roll = rng();
            if (roll < 0.25) {
                text += `${buildEmphasisChunk(options.targetKeys, rng)}`;
            } else if (pool && roll < 0.85) {
                text += `${pick(rng, pool)} `;
            } else {
                const chunk = randomChunk({ letters, allowSpace }, rng);
                if (chunk) text += `${chunk} `;
            }
        }
        return text.trim();
    }

    /**
     * @param {Object} options
     * @param {() => number} rng
     */
    function generateWords(options, rng) {
        const { letters } = buildAllowedChars(options.targetKeys);
        const dict = window.PracticeWordlistEN || [];
        const allowedSet = new Set(letters);

        // Narrow groups (home row, numbers): only dictionary words using allowed letters.
        const useConstrained =
            letters.length > 0 &&
            (letters.length <= 14 ||
                dict.filter(w => wordUsesOnlyAllowed(w, allowedSet)).length < 12);

        if (useConstrained) {
            return generateConstrainedWords(options, rng);
        }

        const targetKeys = options.targetKeys || [];
        const targetWords = dict.filter(w => {
            const lower = w.toLowerCase();
            return targetKeys.some(k => {
                if (k === ' ') return lower.includes(' ');
                if (k.length !== 1) return false;
                return lower.includes(k);
            });
        });
        const pool = targetWords.length > 0 ? targetWords : dict;
        const weighted = [];
        pool.forEach(w => {
            const weight = targetWords.includes(w) ? 3 : 1;
            for (let i = 0; i < weight; i++) weighted.push(w);
        });
        let text = '';
        while (text.length < (options.length || DEFAULT_LENGTH)) {
            const roll = rng();
            if (roll < 0.35) {
                text += buildEmphasisChunk(targetKeys, rng);
            } else {
                text += `${pick(rng, weighted)} `;
            }
        }
        return text.trim();
    }

    function generateRandom(options, rng) {
        const keys = (options.targetKeys || []).filter(
            k => k && k !== 'Enter' && k !== 'Tab' && k !== 'CapsLock',
        );
        const chars = keys.length ? keys : ['a'];
        let text = '';
        while (text.length < (options.length || DEFAULT_LENGTH)) {
            const key = pick(rng, chars);
            if (key === ' ') text += ' ';
            else if (key.length === 1) text += key;
            else text += `${key} `;
            if (rng() < 0.12) text += ' ';
        }
        return text.trim();
    }

    function generateRepeat(options) {
        const keys = (options.targetKeys || []).filter(k => k && k !== 'Enter' && k !== 'Tab');
        const unit = keys.length ? keys.join(' ') : 'a';
        const targetLen = options.length || DEFAULT_LENGTH;
        let text = '';
        while (text.length < targetLen) {
            text += `${unit} `;
        }
        return text.trim();
    }

    /**
     * @param {Object} options
     * @returns {{ text: string, stats: { length: number, targetCharRatio: number } }}
     */
    function generateExercise(options = {}) {
        const length = Math.max(
            MIN_LENGTH,
            Math.min(MAX_LENGTH, Number(options.length) || DEFAULT_LENGTH),
        );
        const style = options.style || 'words';
        const seed = Number.isFinite(options.seed) ? options.seed : Date.now();
        const rng = style === 'repeat' ? null : createRng(seed);
        const targetKeys = [...(options.targetKeys || [])];

        let text;
        if (style === 'random') {
            text = generateRandom({ ...options, length }, rng);
        } else if (style === 'repeat') {
            text = generateRepeat({ ...options, length });
        } else {
            text = generateWords({ ...options, length }, rng);
        }

        if (text.length > length) {
            text = text.slice(0, length).trim();
        }

        let attempts = 0;
        const minRatio = style === 'random' || style === 'repeat' ? 0.85 : 0.55;
        while (attempts < 4 && targetKeys.length > 0) {
            const alphaLen = Math.max(text.replace(/\s/g, '').length, 1);
            const ratio = countTargetChars(text, targetKeys) / alphaLen;
            if (ratio >= minRatio) break;
            if (style === 'repeat') break;
            if (style === 'random') {
                text = generateRandom({ ...options, length }, rng);
            } else {
                text = generateConstrainedWords({ ...options, length }, rng);
            }
            if (text.length > length) text = text.slice(0, length).trim();
            attempts++;
        }

        const alphaLen = Math.max(text.replace(/\s/g, '').length, 1);
        return {
            text,
            stats: {
                length: text.length,
                targetCharRatio: countTargetChars(text, targetKeys) / alphaLen,
            },
        };
    }

    window.ExerciseGenerator = {
        generateExercise,
        createRng,
        buildAllowedChars,
        wordUsesOnlyAllowed,
        MIN_LENGTH,
        MAX_LENGTH,
        DEFAULT_LENGTH,
    };
})();
