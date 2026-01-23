<script lang="ts">
    import { t, locale } from "svelte-i18n";
    import {
        isDarkMode,
        isSettingsOpen,
        settingsWsUrl,
        settingsListenPorts,
        settingsForwardTargets,
        uiScale,
        autoStartEnabled,
        silentStartEnabled,
    } from "$lib/stores/stores";
    import {
        saveConfiguration,
        setAutoStart,
        setSilentStart,
    } from "$lib/bridge";
    import TechInput from "./shared/TechInput.svelte";
    import TechToggle from "./shared/TechToggle.svelte";
    import Settings from "$lib/icons/Settings.svelte";
    import X from "$lib/icons/X.svelte";

    import Server from "$lib/icons/Server.svelte";
    import Radio from "$lib/icons/Radio.svelte";
    import Send from "$lib/icons/Send.svelte";
    import Trash2 from "$lib/icons/Trash2.svelte";
    import Plus from "$lib/icons/Plus.svelte";

    // --- Theme Styles (Reactive) ---
    // Updated to match TrafficMonitor's precise technical look
    $: modalBg = $isDarkMode
        ? "bg-[#18181b] border-slate-900 shadow-2xl shadow-black/50"
        : "bg-white border-slate-900 shadow-xl shadow-slate-200/50";
    $: headerBg = $isDarkMode
        ? "bg-[#000000] text-slate-400 border-b border-slate-800"
        : "bg-slate-800 text-slate-200 border-b border-slate-900";
    $: contentBg = $isDarkMode ? "bg-[#18181b]" : "bg-white";
    $: sectionLabel = $isDarkMode ? "text-slate-500" : "text-slate-400";
    $: footerBg = $isDarkMode
        ? "bg-[#1e1e22] border-t border-slate-800"
        : "bg-slate-50 border-t border-slate-300";

    // Button Styles - Technical/Squared
    $: btnSecondary = $isDarkMode
        ? "bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
        : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800";

    // Primary Button - Matching the Header Color (Industrial Style)
    $: btnPrimary = $isDarkMode
        ? "bg-[#000000] border-slate-700 text-emerald-500 hover:bg-slate-900 hover:text-emerald-400"
        : "bg-slate-800 border-slate-900 text-white hover:bg-slate-700 hover:text-white";

    $: btnDestructive =
        "text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors rounded-sm";

    // --- Local State (Buffer) ---
    let localUiScale = 1.0;
    let originalUiScale = 1.0; // Snapshot for reverting
    let localWsPort = "9122"; // Default
    let localListenPorts: string[] = [];
    let localForwardTargets: string[] = [];

    // --- Live Preview ---
    $: if (renderModal) {
        uiScale.set(localUiScale);
    }

    // --- Event Handlers ---
    const handleSaveAndClose = async () => {
        uiScale.set(localUiScale);

        // Reconstruct full WebSocket URL from the port
        const cleanPort = localWsPort.replace(/\D/g, "") || "9122";
        settingsWsUrl.set(`ws://localhost:${cleanPort}`);

        settingsListenPorts.set(localListenPorts);
        settingsForwardTargets.set(localForwardTargets);

        await saveConfiguration();
        isSettingsOpen.set(false);
    };

    const handleCloseWithoutSaving = () => {
        uiScale.set(originalUiScale);
        isSettingsOpen.set(false);
    };

    const removePort = (idx: number) => {
        localListenPorts = localListenPorts.filter((_, i) => i !== idx);
    };
    const addPort = () => {
        localListenPorts = [...localListenPorts, ""];
    };

    const removeTarget = (idx: number) => {
        localForwardTargets = localForwardTargets.filter((_, i) => i !== idx);
    };
    const addTarget = () => {
        localForwardTargets = [...localForwardTargets, ""];
    };

    const toggleLanguage = () => {
        locale.update((l) => (l === "en" ? "zh-CN" : "en"));
    };

    // --- Animation & Initialization Logic ---
    let renderModal = false;
    let isClosing = false;

    $: {
        if ($isSettingsOpen) {
            if (!renderModal) {
                // Initialize local state from stores when opening
                localUiScale = $uiScale;
                originalUiScale = $uiScale; // Capture snapshot

                // Parse port from existing URL
                try {
                    const url = new URL($settingsWsUrl);
                    localWsPort = url.port || "9122";
                } catch (e) {
                    const match = $settingsWsUrl.match(/:(\d+)/);
                    localWsPort = match ? match[1] : "9122";
                }

                localListenPorts = [...$settingsListenPorts];
                localForwardTargets = [...$settingsForwardTargets];
            }
            renderModal = true;
            isClosing = false;
        } else if (renderModal && !isClosing) {
            isClosing = true;
            setTimeout(() => {
                renderModal = false;
                isClosing = false;
            }, 140);
        }
    }
</script>

{#if renderModal}
    <div
        class="settings-backdrop fixed top-[3px] right-[4px] bottom-[4px] left-[3px] z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] {isClosing
            ? 'closing'
            : ''}"
    >
        <div
            class="settings-modal w-[600px] max-w-[95vw] max-h-[85vh] border-2 rounded-sm flex flex-col overflow-hidden shadow-2xl {modalBg} {isClosing
                ? 'closing'
                : ''}"
        >
            <!-- Modal Header (Industrial / Technical Style) -->
            <div
                class="h-10 flex items-center justify-between px-3 shrink-0 select-none {headerBg}"
            >
                <div class="flex items-center gap-2">
                    <div
                        class="p-1 rounded-sm {$isDarkMode
                            ? 'text-emerald-400'
                            : 'text-emerald-600'}"
                    >
                        <Settings size={14} />
                    </div>
                    <span class="text-xs font-black uppercase tracking-wider"
                        >{$t("settings.title")}</span
                    >
                </div>
                <button
                    on:click={handleCloseWithoutSaving}
                    class="p-1.5 rounded-sm hover:bg-black/10 transition-colors {$isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-500 hover:text-slate-900'}"
                >
                    <X size={16} />
                </button>
            </div>

            <!-- Modal Content (Denser Layout) -->
            <div class="flex-1 overflow-y-auto p-4 space-y-6 {contentBg}">
                <!-- Group 1: General Settings -->
                <!-- Group 1: General Settings (Refactored Layout) -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Left Column: Language & Interface Scaling -->
                    <div class="flex flex-col gap-4">
                        <!-- Language -->
                        <div class="space-y-1.5">
                            <label
                                class="text-[10px] uppercase font-bold tracking-wider {$isDarkMode
                                    ? 'text-slate-400'
                                    : 'text-slate-500'}">{"Language"}</label
                            >
                            <button
                                on:click={toggleLanguage}
                                class="w-full h-8 px-3 rounded-sm text-xs font-mono border-2 flex items-center justify-between transition-all {$isDarkMode
                                    ? 'bg-[#09090b] border-slate-700 text-slate-200 hover:border-emerald-500/50'
                                    : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-500/50'}"
                            >
                                <span
                                    >{$locale === "en"
                                        ? "English"
                                        : "简体中文"}</span
                                >
                                <div class="flex gap-1">
                                    <span
                                        class="text-[9px] uppercase opacity-50 font-sans font-bold"
                                        >{$locale === "en" ? "EN" : "CN"}</span
                                    >
                                </div>
                            </button>
                        </div>

                        <!-- UI Scale -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <label
                                    class="text-[10px] uppercase font-bold tracking-wider {$isDarkMode
                                        ? 'text-slate-400'
                                        : 'text-slate-500'}"
                                    >{$t("settings.ui_scale")}</label
                                >
                                <span
                                    class="text-[10px] font-mono {sectionLabel}"
                                    >{Math.round(localUiScale * 100)}%</span
                                >
                            </div>
                            <div class="h-8 flex items-center">
                                <input
                                    type="range"
                                    min="0.75"
                                    max="1.5"
                                    step="0.05"
                                    bind:value={localUiScale}
                                    class="w-full h-1.5 rounded-none appearance-none cursor-pointer {$isDarkMode
                                        ? 'bg-slate-800 accent-emerald-500'
                                        : 'bg-slate-200 accent-emerald-600'}"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Auto Start & Silent Start -->
                    <div class="flex flex-col gap-8">
                        <!-- Spacer to align with Language label approx height if needed, but typically cleaner without if not strict -->
                        <!-- Auto Start Group (No Label) -->
                        <div class="flex flex-col gap-6 pt-[1.6rem]">
                            <TechToggle
                                label={$t("settings.auto_start") ||
                                    "Auto Start"}
                                checked={$autoStartEnabled}
                                isDark={$isDarkMode}
                                labelClass="text-xs"
                                on:change={(e) => setAutoStart(e.detail)}
                            />
                            <TechToggle
                                label={$t("settings.silent_start") ||
                                    "Silent Start"}
                                checked={$silentStartEnabled}
                                isDark={$isDarkMode}
                                labelClass="text-xs"
                                on:change={(e) => setSilentStart(e.detail)}
                            />
                        </div>
                    </div>
                </div>

                <div
                    class="h-px w-full {$isDarkMode
                        ? 'bg-slate-800'
                        : 'bg-slate-200'}"
                ></div>

                <!-- Group 2: Network I/O -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Listen Ports -->
                    <div class="space-y-2">
                        <div
                            class="flex items-center justify-between border-b pb-1 {$isDarkMode
                                ? 'border-slate-800'
                                : 'border-slate-200'}"
                        >
                            <div
                                class="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider {$isDarkMode
                                    ? 'text-slate-300'
                                    : 'text-slate-600'}"
                            >
                                <Radio size={12} class="text-emerald-500" />
                                {$t("settings.listening_ports")}
                            </div>
                            <button
                                on:click={addPort}
                                class="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-bold uppercase"
                            >
                                <Plus size={10} />
                                {$t("settings.add_port")}
                            </button>
                        </div>
                        <div class="space-y-2">
                            {#each localListenPorts as _, idx (idx)}
                                <div class="relative group/item">
                                    <TechInput
                                        bind:value={localListenPorts[idx]}
                                        className="w-full"
                                        inputClass="pr-7"
                                        isDark={$isDarkMode}
                                        placeholder="e.g. 9000"
                                    />
                                    <button
                                        on:click={() => removePort(idx)}
                                        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm opacity-0 group-hover/item:opacity-100 transition-all duration-200 z-10 {btnDestructive}"
                                        title="Remove"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            {/each}
                            {#if localListenPorts.length === 0}
                                <div
                                    class="text-[10px] italic py-4 text-center border-2 border-dashed rounded-sm {$isDarkMode
                                        ? 'border-slate-800 text-slate-600'
                                        : 'border-slate-200 text-slate-400'}"
                                >
                                    No inputs configured
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Forward Targets -->
                    <div class="space-y-2">
                        <div
                            class="flex items-center justify-between border-b pb-1 {$isDarkMode
                                ? 'border-slate-800'
                                : 'border-slate-200'}"
                        >
                            <div
                                class="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider {$isDarkMode
                                    ? 'text-slate-300'
                                    : 'text-slate-600'}"
                            >
                                <Send size={12} class="text-emerald-500" />
                                {$t("settings.forwarding_targets")}
                            </div>
                            <button
                                on:click={addTarget}
                                class="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-bold uppercase"
                            >
                                <Plus size={10} />
                                {$t("settings.add_target")}
                            </button>
                        </div>
                        <div class="space-y-2">
                            {#each localForwardTargets as _, idx (idx)}
                                <div class="relative group/item">
                                    <TechInput
                                        bind:value={localForwardTargets[idx]}
                                        className="w-full"
                                        inputClass="pr-7"
                                        isDark={$isDarkMode}
                                        placeholder="127.0.0.1:9001"
                                    />
                                    <button
                                        on:click={() => removeTarget(idx)}
                                        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm opacity-0 group-hover/item:opacity-100 transition-all duration-200 z-10 {btnDestructive}"
                                        title="Remove"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            {/each}
                            {#if localForwardTargets.length === 0}
                                <div
                                    class="text-[10px] italic py-4 text-center border-2 border-dashed rounded-sm {$isDarkMode
                                        ? 'border-slate-800 text-slate-600'
                                        : 'border-slate-200 text-slate-400'}"
                                >
                                    No outputs configured
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <div
                    class="h-px w-full {$isDarkMode
                        ? 'bg-slate-800'
                        : 'bg-slate-200'}"
                ></div>

                <!-- Section: WebSocket -->
                <div>
                    <div class="space-y-2">
                        <label
                            class="text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 {$isDarkMode
                                ? 'text-slate-400'
                                : 'text-slate-500'}"
                        >
                            <Server size={12} class="text-emerald-500" />
                            {$t("settings.ws_host")}
                        </label>

                        <!-- Fixed Prefix Input Group (Technical Style) -->
                        <div
                            class="flex items-center h-8 border-2 rounded-sm transition-all duration-200
                            {$isDarkMode
                                ? 'bg-[#09090b] border-slate-700 focus-within:border-emerald-500/50'
                                : 'bg-white border-slate-300 focus-within:border-emerald-500/50'}"
                        >
                            <div
                                class="pl-2 pr-1 select-none font-mono text-xs opacity-50 {$isDarkMode
                                    ? 'text-slate-500'
                                    : 'text-slate-400'}"
                            >
                                ws://localhost:
                            </div>

                            <input
                                type="text"
                                bind:value={localWsPort}
                                placeholder="9122"
                                class="flex-1 h-full bg-transparent border-none text-xs font-mono focus:outline-none focus:ring-0 pl-0
                                    {$isDarkMode
                                    ? 'text-slate-200 placeholder:text-slate-700'
                                    : 'text-slate-800 placeholder:text-slate-300'}"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div
                class="h-12 px-4 flex items-center justify-between shrink-0 {footerBg}"
            >
                <div>
                    <!-- Optional status text -->
                </div>
                <div class="flex items-center gap-3">
                    <button
                        on:click={handleCloseWithoutSaving}
                        class="h-7 px-3 rounded-sm border text-[10px] font-bold uppercase tracking-wider transition-all {btnSecondary}"
                    >
                        {$t("topbar.close")}
                    </button>
                    <button
                        on:click={handleSaveAndClose}
                        class="h-7 px-4 rounded-sm border-b-2 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 active:border-b-0 active:translate-y-[2px] {btnPrimary}"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Pure CSS fade animation */
    .settings-backdrop {
        animation: fade-in 100ms ease-out forwards;
    }

    .settings-backdrop.closing {
        animation: fade-out 100ms ease-in forwards;
    }

    .settings-modal {
        animation: zoom-in 100ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .settings-modal.closing {
        animation: zoom-out 100ms ease-in forwards;
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes fade-out {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    @keyframes zoom-in {
        from {
            opacity: 0;
            transform: scale(0.98);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes zoom-out {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.98);
        }
    }
</style>
