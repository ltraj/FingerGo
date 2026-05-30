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
        let s = (seed >>> 0) || 1;
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
     * @returns {boolean}
     */
    function wordMatches(word, targetKeys) {
        const lower = word.toLowerCase();
        return targetKeys.some(k => {
            if (k === ' ') return lower.includes(' ');
            if (k.length !== 1) return false;
            return lower.includes(k);
        });
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
        const key = pick(rng, targetKeys.filter(k => k !== 'Enter' && k !== 'Tab'));
        if (!key || key === ' ') return '   ';
        if (key.length === 1) {
            const rep = 2 + Math.floor(rng() * 2);
            return `${key.repeat(rep)} `;
        }
        return `${key} `;
    }

    /**
     * @param {Object} options
     * @param {string[]} options.targetKeys
     * @param {number} [options.length]
     * @param {string} [options.style] words | random | repeat
     * @param {number} [options.seed]
     */
    function generateWords(options, rng) {
        const targetKeys = options.targetKeys || [];
        const words = window.PracticeWordlistEN || [];
        const targetWords = words.filter(w => wordMatches(w, targetKeys));
        const pool = targetWords.length > 0 ? targetWords : words;
        const weighted = [];
        pool.forEach(w => {
            const weight = wordMatches(w, targetKeys) ? 3 : 1;
            for (let i = 0; i < weight; i++) weighted.push(w);
        });
        const filler = words.filter(w => !wordMatches(w, targetKeys));
        let text = '';
        while (text.length < (options.length || DEFAULT_LENGTH)) {
            const roll = rng();
            if (roll < 0.2) {
                text += buildEmphasisChunk(targetKeys, rng);
            } else if (roll < 0.9) {
                text += `${pick(rng, weighted)} `;
            } else if (filler.length) {
                text += `${pick(rng, filler)} `;
            } else {
                text += `${pick(rng, weighted)} `;
            }
        }
        return text.trim();
    }

    function generateRandom(options, rng) {
        const keys = (options.targetKeys || []).filter(k => k && k !== 'Enter' && k !== 'Tab');
        const chars = keys.length ? keys : ['a'];
        let text = '';
        while (text.length < (options.length || DEFAULT_LENGTH)) {
            const key = pick(rng, chars);
            text += key === ' ' ? ' ' : key.length === 1 ? key : `${key} `;
            if (rng() < 0.14) text += ' ';
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
        while (attempts < 3 && targetKeys.length > 0) {
            const ratio = countTargetChars(text, targetKeys) / Math.max(text.replace(/\s/g, '').length, 1);
            if (ratio >= 0.25) break;
            if (style === 'repeat') break;
            text = style === 'random' ? generateRandom({ ...options, length }, rng) : generateWords({ ...options, length }, rng);
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
        MIN_LENGTH,
        MAX_LENGTH,
        DEFAULT_LENGTH,
    };
})();
