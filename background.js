// Background Script (Service Worker) - Resource Monitor
class ResourceMonitorBackground {
    constructor() {
        this.initializeListeners();
        this.activeConnections = new Map();
    }

    // イベントリスナーの初期化
    initializeListeners() {
        // 拡張機能インストール時
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Resource Monitor installed:', details);
            this.handleInstall(details);
        });

        // メッセージリスナー
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 非同期レスポンス用
        });

        // DevToolsからの接続
        chrome.runtime.onConnect.addListener((port) => {
            this.handleConnection(port);
        });

        // タブ更新の監視
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // タブアクティブ化の監視
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });
    }

    // インストール処理
    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('Resource Monitor: First time installation');
            // 初回インストール時の処理
            this.setDefaultSettings();
        } else if (details.reason === 'update') {
            console.log('Resource Monitor: Extension updated');
            // アップデート時の処理
            this.handleUpdate(details);
        }
    }

    // デフォルト設定の保存
    async setDefaultSettings() {
        const defaultSettings = {
            autoRefresh: true,
            refreshInterval: 5000,
            maxResourceCount: 1000,
            enableTimeline: true,
            enableNotifications: false,
            theme: 'light'
        };

        try {
            await chrome.storage.sync.set({ settings: defaultSettings });
            console.log('Resource Monitor: Default settings saved');
        } catch (error) {
            console.error('Resource Monitor: Failed to save default settings', error);
        }
    }

    // メッセージ処理
    async handleMessage(message, sender, sendResponse) {
        console.log('Resource Monitor: Received message', message.type);

        switch (message.type) {
            case 'GET_PERFORMANCE_DATA':
                this.getPerformanceData(sender.tab.id, sendResponse);
                break;

            case 'RESOURCE_UPDATE':
                this.handleResourceUpdate(message, sender);
                sendResponse({ success: true });
                break;

            case 'GET_SETTINGS':
                this.getSettings(sendResponse);
                break;

            case 'SAVE_SETTINGS':
                this.saveSettings(message.settings, sendResponse);
                break;

            case 'CLEAR_DATA':
                this.clearStoredData(sendResponse);
                break;

            case 'EXPORT_DATA':
                this.exportData(message.data, sendResponse);
                break;

            default:
                console.warn('Resource Monitor: Unknown message type', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    }

    // パフォーマンスデータの取得
    async getPerformanceData(tabId, sendResponse) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: () => {
                    // ページ内で実行される関数
                    const getResourceData = () => {
                        const resources = [];
                        const navigationEntry = performance.getEntriesByType('navigation')[0];
                        const resourceEntries = performance.getEntriesByType('resource');
                        
                        // ナビゲーション情報
                        if (navigationEntry) {
                            resources.push({
                                name: navigationEntry.name,
                                url: navigationEntry.name,
                                type: 'document',
                                startTime: navigationEntry.startTime,
                                endTime: navigationEntry.loadEventEnd,
                                duration: navigationEntry.loadEventEnd - navigationEntry.startTime,
                                size: navigationEntry.transferSize || 0,
                                status: 'success'
                            });
                        }
                        
                        // リソース情報
                        resourceEntries.forEach(entry => {
                            const getResourceType = (entry) => {
                                const url = entry.name.toLowerCase();
                                
                                if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
                                    return 'xmlhttprequest';
                                }
                                if (url.includes('.css') || entry.initiatorType === 'link') return 'stylesheet';
                                if (url.includes('.js') || entry.initiatorType === 'script') return 'script';
                                if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) return 'image';
                                if (url.match(/\.(woff|woff2|ttf|otf|eot)$/)) return 'font';
                                return 'other';
                            };

                            resources.push({
                                name: entry.name.split('/').pop() || entry.name,
                                url: entry.name,
                                type: getResourceType(entry),
                                startTime: entry.startTime,
                                endTime: entry.responseEnd,
                                duration: entry.responseEnd - entry.startTime,
                                size: entry.transferSize || 0,
                                status: entry.responseEnd > 0 ? 'success' : 'error'
                            });
                        });
                        
                        return resources;
                    };
                    
                    return getResourceData();
                }
            });

            if (results && results[0] && results[0].result) {
                sendResponse({ success: true, data: results[0].result });
            } else {
                sendResponse({ success: false, error: 'No data available' });
            }
        } catch (error) {
            console.error('Resource Monitor: Error getting performance data', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // DevTools接続処理
    handleConnection(port) {
        console.log('Resource Monitor: DevTools connected');
        
        const tabId = port.sender?.tab?.id;
        if (tabId) {
            this.activeConnections.set(tabId, port);
            
            port.onDisconnect.addListener(() => {
                console.log('Resource Monitor: DevTools disconnected');
                this.activeConnections.delete(tabId);
            });
        }
    }

    // タブ更新処理
    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete') {
            console.log('Resource Monitor: Tab loaded', tab.url);
            
            // アクティブな接続に通知
            const port = this.activeConnections.get(tabId);
            if (port) {
                try {
                    port.postMessage({
                        type: 'TAB_UPDATED',
                        tabId: tabId,
                        url: tab.url
                    });
                } catch (error) {
                    console.log('Resource Monitor: Failed to send tab update message');
                }
            }
        }
    }

    // タブアクティブ化処理
    handleTabActivated(activeInfo) {
        console.log('Resource Monitor: Tab activated', activeInfo.tabId);
        // 必要に応じて処理を追加
    }

    // リソース更新処理
    handleResourceUpdate(message, sender) {
        console.log('Resource Monitor: Resource update received', message);
        
        // DevToolsパネルに転送
        const tabId = sender.tab?.id;
        const port = this.activeConnections.get(tabId);
        
        if (port) {
            try {
                port.postMessage({
                    type: 'RESOURCE_UPDATED',
                    data: message
                });
            } catch (error) {
                console.log('Resource Monitor: Failed to forward resource update');
            }
        }
    }

    // 設定の取得
    async getSettings(sendResponse) {
        try {
            const result = await chrome.storage.sync.get('settings');
            sendResponse({ success: true, settings: result.settings || {} });
        } catch (error) {
            console.error('Resource Monitor: Error getting settings', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 設定の保存
    async saveSettings(settings, sendResponse) {
        try {
            await chrome.storage.sync.set({ settings: settings });
            console.log('Resource Monitor: Settings saved');
            sendResponse({ success: true });
        } catch (error) {
            console.error('Resource Monitor: Error saving settings', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // データクリア
    async clearStoredData(sendResponse) {
        try {
            await chrome.storage.local.clear();
            console.log('Resource Monitor: Stored data cleared');
            sendResponse({ success: true });
        } catch (error) {
            console.error('Resource Monitor: Error clearing data', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // データエクスポート
    async exportData(data, sendResponse) {
        try {
            // データを適切な形式で保存
            const exportData = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                data: data
            };

            // ローカルストレージに一時保存
            const key = `export_${Date.now()}`;
            await chrome.storage.local.set({ [key]: exportData });
            
            sendResponse({ success: true, exportKey: key });
        } catch (error) {
            console.error('Resource Monitor: Error exporting data', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // アップデート処理
    handleUpdate(details) {
        console.log('Resource Monitor: Handling update from', details.previousVersion);
        // バージョン固有のアップデート処理
    }
}

// バックグラウンドスクリプトの初期化
const resourceMonitorBackground = new ResourceMonitorBackground();

// デバッグ用
if (typeof globalThis !== 'undefined') {
    globalThis.resourceMonitorBackground = resourceMonitorBackground;
}