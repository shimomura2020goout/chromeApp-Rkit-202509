// Content Script - ページリソース監視
class PageResourceMonitor {
    constructor() {
        this.initializeResourceTracking();
    }

    // リソース追跡の初期化
    initializeResourceTracking() {
        // ページ読み込み完了を監視
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onPageLoaded());
            window.addEventListener('load', () => this.onPageFullyLoaded());
        } else {
            this.onPageLoaded();
            if (document.readyState === 'complete') {
                this.onPageFullyLoaded();
            }
        }

        // 動的リソース読み込みを監視
        this.observeNetworkRequests();
        
        // ページの変更を監視（SPA対応）
        this.observePageChanges();
    }

    // ページ読み込み完了時の処理
    onPageLoaded() {
        console.log('Resource Monitor: Page DOMContentLoaded');
        this.notifyResourceUpdate();
    }

    // ページ完全読み込み完了時の処理
    onPageFullyLoaded() {
        console.log('Resource Monitor: Page fully loaded');
        this.notifyResourceUpdate();
    }

    // ネットワークリクエストの監視
    observeNetworkRequests() {
        // Fetch APIのインターセプト
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            console.log('Resource Monitor: Fetch request detected', args[0]);
            return originalFetch.apply(this, args).then(response => {
                this.notifyResourceUpdate();
                return response;
            });
        };

        // XMLHttpRequestのインターセプト
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            console.log('Resource Monitor: XHR request detected', args[1]);
            this.addEventListener('loadend', () => {
                pageResourceMonitor.notifyResourceUpdate();
            });
            return originalXHROpen.apply(this, args);
        };
    }

    // ページ変更の監視（SPA対応）
    observePageChanges() {
        // History APIの変更を監視
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            setTimeout(() => this.notifyResourceUpdate(), 100);
            return originalPushState.apply(history, args);
        };

        history.replaceState = (...args) => {
            setTimeout(() => this.notifyResourceUpdate(), 100);
            return originalReplaceState.apply(history, args);
        };

        window.addEventListener('popstate', () => {
            setTimeout(() => this.notifyResourceUpdate(), 100);
        });
    }

    // DevToolsパネルにリソース更新を通知
    notifyResourceUpdate() {
        // メッセージをDevToolsパネルに送信
        try {
            chrome.runtime.sendMessage({
                type: 'RESOURCE_UPDATE',
                url: location.href,
                timestamp: Date.now()
            });
        } catch (error) {
            console.log('Resource Monitor: Could not send message to extension');
        }
    }

    // パフォーマンス情報の取得
    getPerformanceData() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        return {
            navigation: navigation ? {
                url: navigation.name,
                loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint()
            } : null,
            
            resources: resources.map(resource => ({
                name: resource.name,
                type: this.determineResourceType(resource),
                startTime: resource.startTime,
                endTime: resource.responseEnd,
                duration: resource.responseEnd - resource.startTime,
                size: resource.transferSize || resource.encodedBodySize || 0,
                initiator: resource.initiatorType
            })),
            
            timing: {
                navigationStart: performance.timeOrigin,
                now: performance.now()
            }
        };
    }

    // リソースタイプの判定
    determineResourceType(resource) {
        const url = resource.name.toLowerCase();
        const initiator = resource.initiatorType;

        if (initiator === 'xmlhttprequest' || initiator === 'fetch') {
            return 'xhr';
        }
        
        if (url.includes('.css') || initiator === 'link') {
            return 'stylesheet';
        }
        
        if (url.includes('.js') || initiator === 'script') {
            return 'script';
        }
        
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i)) {
            return 'image';
        }
        
        if (url.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
            return 'font';
        }
        
        if (url.match(/\.(mp4|webm|ogg|avi|mov)$/i)) {
            return 'media';
        }
        
        return 'other';
    }

    // First Paint の取得
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }

    // First Contentful Paint の取得
    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : null;
    }

    // リソース監視の開始
    startMonitoring() {
        console.log('Resource Monitor: Starting resource monitoring');
        
        // 定期的にリソース情報を更新
        setInterval(() => {
            this.notifyResourceUpdate();
        }, 5000); // 5秒間隔
    }

    // リソース監視の停止
    stopMonitoring() {
        console.log('Resource Monitor: Stopping resource monitoring');
        // 必要に応じてクリーンアップ処理を追加
    }
}

// Content Scriptメッセージリスナー
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PERFORMANCE_DATA') {
        sendResponse(pageResourceMonitor.getPerformanceData());
        return true;
    }
    
    if (message.type === 'START_MONITORING') {
        pageResourceMonitor.startMonitoring();
        sendResponse({success: true});
        return true;
    }
    
    if (message.type === 'STOP_MONITORING') {
        pageResourceMonitor.stopMonitoring();
        sendResponse({success: true});
        return true;
    }
});

// ページリソースモニターの初期化
const pageResourceMonitor = new PageResourceMonitor();

// デバッグ用
if (typeof window !== 'undefined') {
    window.pageResourceMonitor = pageResourceMonitor;
}