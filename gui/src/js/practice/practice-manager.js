// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Coordinates targeted and custom-text practice flows.
 */
(() => {
    const esc = window.AppUtils?.escapeHtml || (s => String(s ?? ''));

    let activeMeta = null;
    let lastExerciseOptions = null;

    function getLayoutId() {
        return window.SettingsManager?.getKeyboardLayout?.() || 'en-qwerty';
    }

    function setBannerVisible(visible, html = '') {
        const banner = document.getElementById('practice-banner');
        if (!banner) return;
        banner.hidden = !visible;
        if (visible && html) banner.innerHTML = html;
    }

    function updateBanner() {
        if (!activeMeta) {
            setBannerVisible(false);
            return;
        }
        const modeLabel =
            activeMeta.practiceMode === 'custom-text' ? 'Custom text' : 'Targeted practice';
        const keys =
            activeMeta.targetKeys?.length > 0
                ? esc(activeMeta.targetKeys.slice(0, 12).join(' ')) +
                  (activeMeta.targetKeys.length > 12 ? '…' : '')
                : '';
        setBannerVisible(
            true,
            `<span class="practice-banner-label">${esc(modeLabel)}</span>` +
                `<span class="practice-banner-detail">${esc(activeMeta.practiceGroupName || '')}</span>` +
                (keys ? `<span class="practice-banner-keys">${keys}</span>` : '') +
                `<button type="button" id="practice-exit-btn" class="practice-banner-btn">Exit</button>` +
                (activeMeta.practiceMode === 'targeted'
                    ? `<button type="button" id="practice-change-btn" class="practice-banner-btn">Change</button>`
                    : ''),
        );
        document.getElementById('practice-exit-btn')?.addEventListener('click', () => exitPractice());
        document.getElementById('practice-change-btn')?.addEventListener('click', () => openTargetedModal());
    }

    async function fetchCustomGroups() {
        if (!window.go?.app?.App?.GetPracticeGroups) return [];
        try {
            return (await window.go.app.App.GetPracticeGroups()) || [];
        } catch (err) {
            console.error('GetPracticeGroups failed:', err);
            return [];
        }
    }

    async function fetchWeakKeys(limit = 50) {
        if (!window.go?.app?.App?.AggregateKeyMistakes) return [];
        try {
            const agg = await window.go.app.App.AggregateKeyMistakes(limit);
            return Object.entries(agg || {})
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);
        } catch (err) {
            console.error('AggregateKeyMistakes failed:', err);
            return [];
        }
    }

    async function saveCustomGroup(group) {
        return window.go.app.App.SavePracticeGroup(group);
    }

    async function deleteCustomGroup(id) {
        return window.go.app.App.DeletePracticeGroup(id);
    }

    /**
     * @param {{ id: string, name: string, keys: string[], source?: string }} group
     * @param {{ length?: number, style?: string, seed?: number }} options
     */
    function startTargeted(group, options = {}) {
        if (!group?.keys?.length) {
            console.error('PracticeManager: group has no keys');
            return;
        }
        const exerciseOptions = {
            targetKeys: group.keys,
            length: options.length || window.ExerciseGenerator?.DEFAULT_LENGTH || 300,
            style: options.style || 'words',
            seed: options.seed,
        };
        const result = window.ExerciseGenerator?.generateExercise(exerciseOptions);
        if (!result?.text) return;

        lastExerciseOptions = { group, options: exerciseOptions };
        activeMeta = {
            practiceMode: 'targeted',
            practiceGroupId: group.id || '',
            practiceGroupName: group.name || 'Targeted',
            targetKeys: [...group.keys],
            textTitle: group.name || 'Targeted Practice',
        };

        window.SessionManager?.loadEphemeralText?.(result.text, {
            textId: '',
            textTitle: activeMeta.textTitle,
            categoryId: '',
            ...activeMeta,
        });
        updateBanner();
        window.ModalManager?.hide();
    }

    /**
     * @param {string} text
     */
    function startCustomText(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return;
        lastExerciseOptions = null;
        const title =
            trimmed.split('\n')[0].trim().slice(0, 64) || 'Custom text practice';
        activeMeta = {
            practiceMode: 'custom-text',
            practiceGroupId: '',
            practiceGroupName: title,
            targetKeys: [],
            textTitle: title,
        };
        window.SessionManager?.loadEphemeralText?.(trimmed, {
            textId: '',
            textTitle: title,
            categoryId: '',
            ...activeMeta,
        });
        updateBanner();
        window.ModalManager?.hide();
    }

    function regenerateTargeted() {
        if (!lastExerciseOptions) return false;
        const { group, options } = lastExerciseOptions;
        startTargeted(group, { ...options, seed: Date.now() });
        return true;
    }

    function clearState() {
        activeMeta = null;
        lastExerciseOptions = null;
        setBannerVisible(false);
    }

    function exitPractice() {
        clearState();
        window.SessionManager?.restoreLibraryText?.();
    }

    function openTargetedModal() {
        window.UIManager?.showModal('targeted-practice', {});
    }

    function openCustomTextModal() {
        window.UIManager?.showModal('custom-text-practice', {});
    }

    function getMeta() {
        return activeMeta ? { ...activeMeta } : null;
    }

    function isActive() {
        return activeMeta !== null;
    }

    function init() {
        window.EventBus?.on('typing:complete', () => {
            if (activeMeta) updateBanner();
        });
    }

    window.PracticeManager = {
        init,
        openTargetedModal,
        openCustomTextModal,
        startTargeted,
        startCustomText,
        exitPractice,
        clearState,
        regenerateTargeted,
        getMeta,
        isActive,
        fetchCustomGroups,
        fetchWeakKeys,
        saveCustomGroup,
        deleteCustomGroup,
        getBuiltinGroups: () =>
            window.BuiltinPracticeGroups?.getBuiltinGroups?.(getLayoutId()) || [],
        getLayoutId,
        esc,
    };
})();
