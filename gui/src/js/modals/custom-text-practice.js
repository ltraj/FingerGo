// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Custom text practice modal: paste ephemeral text and start typing.
 */
(() => {
    if (!window.ModalManager) return;

    const esc = window.AppUtils?.escapeHtml || (s => String(s ?? ''));

    function render() {
        return `<div class="custom-text-practice">
            <p class="practice-muted">Paste any text to practice. It is not saved unless you add it to the library.</p>
            <label for="custom-practice-input">Text</label>
            <textarea id="custom-practice-input" rows="10" placeholder="Paste or type text here…"></textarea>
            <p class="practice-muted">Preview</p>
            <div id="custom-practice-preview" class="practice-preview practice-preview-box"> </div>
            <div class="practice-modal-actions">
                <button type="button" id="custom-practice-save-library">Save to library…</button>
                <button type="button" id="custom-practice-start">Start practice</button>
            </div>
        </div>`;
    }

    function bind(_data, container) {
        const input = container.querySelector('#custom-practice-input');
        const preview = container.querySelector('#custom-practice-preview');
        const updatePreview = () => {
            const text = input?.value || '';
            const snippet = esc(text.slice(0, 200));
            if (preview) {
                preview.textContent = '';
                preview.innerHTML = snippet + (text.length > 200 ? '…' : '') || ' ';
            }
        };
        input?.addEventListener('input', updatePreview);

        container.querySelector('#custom-practice-start')?.addEventListener('click', () => {
            const text = input?.value || '';
            if (!text.trim()) return;
            window.PracticeManager?.startCustomText(text);
        });

        container.querySelector('#custom-practice-save-library')?.addEventListener('click', async () => {
            const text = (input?.value || '').trim();
            if (!text) return;
            const firstLine = text.split('\n')[0].trim().slice(0, 64) || 'Custom text';
            let categories = [];
            try {
                const lib = await window.go?.app?.App?.TextLibrary?.();
                categories = lib?.categories || [];
            } catch {
                /* ignore */
            }
            window.ModalManager?.show('text-editor', {
                mode: 'create',
                text: { title: firstLine, content: text, language: 'text' },
                categories,
                selectedCategory: null,
            });
        });
    }

    window.ModalManager.registerType('custom-text-practice', {
        title: 'Custom Text Practice',
        render,
        bind,
    });
})();
