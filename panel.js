// Resource Monitor Panel - メインロジック
class ResourceMonitor {
    constructor() {
        this.resources = [];
        this.filteredResources = [];
        this.currentFilter = 'all';
        this.currentSort = 'startTime';
        this.sortAscending = true;
        this.selectedResourceUrl = null;
        this.relatedResources = [];
        this.searchQuery = '';
        
        this.initializeEventListeners();
        this.refreshResources();
    }

    // イベントリスナーの初期化
    initializeEventListeners() {
        // ボタンイベント
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshResources());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResources());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        
        // リサイザー機能
        this.initializeResizer();
        
        // フィルターボタン
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.type));
        });
        
        // ソート
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortAndDisplayResources();
        });
        
        document.getElementById('sortOrderBtn').addEventListener('click', () => {
            this.sortAscending = !this.sortAscending;
            document.getElementById('sortOrderBtn').textContent = this.sortAscending ? '⬇️' : '⬆️';
            this.sortAndDisplayResources();
        });
        
        // 検索機能
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyCurrentFilter();
            this.sortAndDisplayResources();
            this.renderTimeline();
        });
        
        document.getElementById('searchClearBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchQuery = '';
            this.applyCurrentFilter();
            this.sortAndDisplayResources();
            this.renderTimeline();
        });

        // テーブルヘッダーソート
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const sortType = e.target.dataset.sort;
                if (this.currentSort === sortType) {
                    this.sortAscending = !this.sortAscending;
                } else {
                    this.currentSort = sortType;
                    this.sortAscending = true;
                }
                document.getElementById('sortSelect').value = sortType;
                document.getElementById('sortOrderBtn').textContent = this.sortAscending ? '⬇️' : '⬆️';
                this.sortAndDisplayResources();
            });
        });

        // テーブルヘッダーツールチップ
        this.setupHeaderTooltips();
    }

    // リサイザーの初期化
    initializeResizer() {
        const resizer = document.getElementById('resizer');
        const timelineSection = document.getElementById('timelineSection');
        const tableSection = document.querySelector('.table-section');
        
        let isResizing = false;
        let startY = 0;
        let startTimelineHeight = 0;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startTimelineHeight = timelineSection.offsetHeight;
            
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaY = e.clientY - startY;
            const newHeight = startTimelineHeight + deltaY;
            const minHeight = 150;
            const maxHeight = window.innerHeight * 0.7;
            
            const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            timelineSection.style.height = constrainedHeight + 'px';
            
            // タイムラインの再描画をトリガー
            setTimeout(() => this.renderTimeline(), 10);
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // リソース情報の取得
    async refreshResources() {
        try {
            // ページロードの完了を待つための短時間遅延
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // シンプルなリソース取得関数を文字列として定義
            const code = `
                (function() {
                    try {
                        function getResourceName(url) {
                            try {
                                const urlObj = new URL(url);
                                const pathname = urlObj.pathname;
                                return pathname.split('/').pop() || urlObj.hostname;
                            } catch {
                                return url;
                            }
                        }
                        
                        function getResourceType(entry) {
                            const url = entry.name.toLowerCase();
                            let detectedType = 'other';
                            
                            // クエリパラメータを除いたパスを取得
                            const urlWithoutQuery = url.split('?')[0].split('#')[0];
                            
                            // 1. XHR/Fetchを最初にチェック
                            if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
                                detectedType = 'xmlhttprequest';
                            }
                            // 2. 画像ファイルを拡張子で判定（クエリパラメータを除外して判定）
                            else if (urlWithoutQuery.match(/\\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|avif)$/)) {
                                detectedType = 'image';
                            }
                            // 3. フォントファイルを拡張子で判定
                            else if (urlWithoutQuery.match(/\\.(woff|woff2|ttf|otf|eot)$/)) {
                                detectedType = 'font';
                            }
                            // 4. JavaScript
                            else if (urlWithoutQuery.match(/\\.(js|jsx|ts|tsx)$/) || entry.initiatorType === 'script') {
                                detectedType = 'script';
                            }
                            // 5. CSS（拡張子で判定を優先）
                            else if (urlWithoutQuery.match(/\\.css$/)) {
                                detectedType = 'stylesheet';
                            }
                            // 6. その他のlinkタイプ（CSS以外の拡張子が明確でない場合のみ）
                            else if (entry.initiatorType === 'link') {
                                detectedType = 'stylesheet';
                            }
                            
                            // デバッグログ（重要なファイルのみ）
                            if (url.includes('.jpeg') || url.includes('.jpg') || url.includes('.js') || url.includes('.css')) {
                                console.log('Resource type detection:', {
                                    url: entry.name,
                                    urlWithoutQuery: urlWithoutQuery,
                                    detectedType: detectedType,
                                    initiatorType: entry.initiatorType,
                                    urlMatches: {
                                        isImage: urlWithoutQuery.match(/\\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|avif)$/),
                                        isScript: urlWithoutQuery.match(/\\.(js|jsx|ts|tsx)$/),
                                        isCSS: urlWithoutQuery.match(/\\.css$/)
                                    }
                                });
                            }
                            
                            return detectedType;
                        }
                        
                        const resources = [];
                        const navigationEntry = performance.getEntriesByType('navigation')[0];
                        
                        // Performance APIのバッファサイズを確認・拡張
                        const currentBufferSize = performance.getEntriesByType('resource').length;
                        const maxBufferSize = 2000; // デフォルトは150-250程度を大幅に増加
                        
                        // バッファサイズ拡張を試行（クリアは行わない）
                        try {
                            // バッファサイズを拡張
                            if (typeof performance.setResourceTimingBufferSize === 'function') {
                                performance.setResourceTimingBufferSize(maxBufferSize);
                                console.log('Set resource timing buffer size to:', maxBufferSize);
                            }
                        } catch (e) {
                            console.warn('Unable to set resource timing buffer size:', e);
                        }
                        
                        // PerformanceObserverを使用してリアルタイム監視を追加（試行）
                        try {
                            if (typeof PerformanceObserver !== 'undefined' && !window.resourceObserver) {
                                window.resourceObserver = new PerformanceObserver((list) => {
                                    const entries = list.getEntries();
                                    console.log('PerformanceObserver detected new resources:', entries.length);
                                });
                                window.resourceObserver.observe({type: 'resource', buffered: true});
                                console.log('PerformanceObserver setup complete for additional resource detection');
                            }
                        } catch (e) {
                            console.warn('Unable to setup PerformanceObserver:', e);
                        }
                        
                        // リソースエントリを取得
                        let resourceEntries = performance.getEntriesByType('resource');
                        
                        // PerformanceObserver を使って追加のリソースを取得試行
                        try {
                            if (typeof PerformanceObserver !== 'undefined') {
                                // 既に観測されたリソースがあるかチェック
                                const allEntries = performance.getEntries();
                                const allResourceEntries = allEntries.filter(entry => 
                                    entry.entryType === 'resource' || entry.entryType === 'navigation'
                                );
                                
                                if (allResourceEntries.length > resourceEntries.length) {
                                    resourceEntries = allEntries.filter(entry => entry.entryType === 'resource');
                                    console.log('Using extended resource entries from performance.getEntries()');
                                }
                            }
                        } catch (e) {
                            console.warn('Unable to use PerformanceObserver approach:', e);
                        }
                        
                        // ナビゲーション情報を追加
                        if (navigationEntry) {
                            const navDomain = new URL(navigationEntry.name).hostname;
                            
                            // ナビゲーションのステータス判定
                            let navStatusCode = navigationEntry.responseStatus || 200; // デフォルト200
                            let navStatusText = 'success';
                            
                            if (navStatusCode >= 200 && navStatusCode < 300) {
                                navStatusText = 'success (' + navStatusCode + ')';
                            } else if (navStatusCode >= 300 && navStatusCode < 400) {
                                navStatusText = 'redirect (' + navStatusCode + ')';
                            } else if (navStatusCode >= 400) {
                                navStatusText = 'error (' + navStatusCode + ')';
                            }
                            
                            resources.push({
                                name: getResourceName(navigationEntry.name),
                                url: navigationEntry.name,
                                domain: navDomain,
                                type: 'document',
                                startTime: navigationEntry.startTime,
                                endTime: navigationEntry.loadEventEnd,
                                duration: navigationEntry.loadEventEnd - navigationEntry.startTime,
                                size: navigationEntry.transferSize || 0,
                                status: navStatusText,
                                statusCode: navStatusCode,
                                cookies: document.cookie.split(';').filter(c => c.trim()).length || 0,
                                cookieDetails: document.cookie || null,
                                isCachedResource: false
                            });
                        }
                        
                        // リソース情報を追加
                        resourceEntries.forEach(entry => {
                            const entryDomain = new URL(entry.name).hostname;
                            
                            // サイズ情報の優先順位: transferSize > encodedBodySize > decodedBodySize
                            let resourceSize = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
                            let isCachedResource = false;
                            
                            // CDN/クロスオリジンリソースの判定（サイズ情報が取得できない場合）
                            // 1. すべてのサイズ情報が0の場合はCORS制限によるキャッシュリソースとして判定
                            if (entry.transferSize === 0 && entry.encodedBodySize === 0 && entry.decodedBodySize === 0) {
                                // ただし、実際にレスポンスが返ってきている場合（responseEnd > 0）
                                if (entry.responseEnd > 0 && entry.responseStart > 0) {
                                    isCachedResource = true;
                                }
                            }
                            
                            // 2. 既知のCDNドメインの場合は強制的にキャッシュリソースとして判定
                            const cdnDomains = ['r.r10s.jp', 'cdn.', 'cloudfront.net', 'fastly.com', 'jsdelivr.net'];
                            const isCdnDomain = cdnDomains.some(cdn => entryDomain.includes(cdn));
                            if (isCdnDomain && resourceSize === 0) {
                                isCachedResource = true;
                            }
                            
                            // transferSizeが0の場合でもencodedBodySizeが存在する場合は使用
                            if (resourceSize === 0 && entry.encodedBodySize > 0) {
                                resourceSize = entry.encodedBodySize;
                            }
                            
                            // HTTPステータスコードの判定
                            let statusText = 'unknown';
                            let statusCode = null;
                            
                            // Performance APIからのHTTPステータスコード取得を試行
                            if (entry.responseStatus) {
                                statusCode = entry.responseStatus;
                            } else if (entry.responseEnd > 0) {
                                // レスポンスが完了している場合は成功と仮定（ステータスコード不明）
                                statusCode = 200; // デフォルトで200と仮定
                            }
                            
                            // ステータス判定
                            if (statusCode) {
                                if (statusCode >= 200 && statusCode < 300) {
                                    statusText = 'success (' + statusCode + ')';
                                } else if (statusCode >= 300 && statusCode < 400) {
                                    statusText = 'redirect (' + statusCode + ')';
                                } else if (statusCode >= 400 && statusCode < 500) {
                                    statusText = 'client error (' + statusCode + ')';
                                } else if (statusCode >= 500) {
                                    statusText = 'server error (' + statusCode + ')';
                                } else {
                                    statusText = 'other (' + statusCode + ')';
                                }
                            } else if (entry.responseEnd > 0) {
                                statusText = 'success';
                            } else {
                                statusText = 'error';
                            }
                            
                            resources.push({
                                name: getResourceName(entry.name),
                                url: entry.name,
                                domain: entryDomain,
                                type: getResourceType(entry),
                                startTime: entry.startTime,
                                endTime: entry.responseEnd,
                                duration: entry.responseEnd - entry.startTime,
                                size: resourceSize,
                                transferSize: entry.transferSize || 0,
                                encodedBodySize: entry.encodedBodySize || 0,
                                decodedBodySize: entry.decodedBodySize || 0,
                                status: statusText,
                                statusCode: statusCode,
                                cookies: 0, // リソースには個別のCookie情報は取得困難
                                cookieDetails: null, // Cookie詳細情報用
                                isCachedResource: isCachedResource // CDN/クロスオリジンリソース判定フラグ
                            });
                        });
                        
                        // 詳細デバッグ情報を追加
                        const allPerformanceEntries = performance.getEntries();
                        const allResourceEntries = allPerformanceEntries.filter(entry => entry.entryType === 'resource');
                        
                        console.log('Resource Monitor Debug Info:', {
                            totalResourcesFound: resources.length,
                            navigationEntries: performance.getEntriesByType('navigation').length,
                            resourceEntriesFromType: resourceEntries.length,
                            allResourceEntriesFromGetEntries: allResourceEntries.length,
                            currentBufferSize: performance.getEntriesByType('resource').length,
                            maxBufferSizeSet: maxBufferSize,
                            performanceTimingSupported: !!performance.getEntriesByType,
                            resourceTimingBufferFull: performance.getEntriesByType('resource').length >= 150,
                            possibleMissedResources: allResourceEntries.length > resourceEntries.length
                        });
                        
                        // バッファフル警告
                        if (performance.getEntriesByType('resource').length >= 150) {
                            console.warn('Performance API buffer may be full. Some resources might be missing.');
                            console.warn('DevTools Network tab shows more resources because it uses different tracking.');
                        }
                        
                        return resources;
                    } catch (error) {
                        return { error: error.message, stack: error.stack };
                    }
                })()
            `;
            
            chrome.devtools.inspectedWindow.eval(
                code,
                (result, isException) => {
                    if (isException) {
                        console.error('Eval error:', isException);
                        this.showErrorMessage('スクリプト実行エラー: ' + JSON.stringify(isException));
                        return;
                    }
                    
                    if (result && result.error) {
                        console.error('Function error:', result);
                        this.showErrorMessage('実行エラー: ' + result.error);
                        return;
                    }
                    
                    if (result && Array.isArray(result)) {
                        this.processResourceData(result);
                    } else {
                        console.warn('リソース情報の取得に失敗しました', result);
                        this.showNoDataMessage();
                    }
                }
            );
        } catch (error) {
            console.error('リソース取得エラー:', error);
            this.showErrorMessage(error.message);
        }
    }

    // ページ内で実行されるリソース取得関数
    getResourceTimingData() {
        // ユーティリティ関数を関数内で定義
        function getResourceName(url) {
            try {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                return pathname.split('/').pop() || urlObj.hostname;
            } catch {
                return url;
            }
        }
        
        function getResourceType(entry) {
            const url = entry.name.toLowerCase();
            
            if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
                return 'xmlhttprequest';
            }
            
            if (url.includes('.css') || entry.initiatorType === 'link') {
                return 'stylesheet';
            }
            
            if (url.includes('.js') || entry.initiatorType === 'script') {
                return 'script';
            }
            
            if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
                return 'image';
            }
            
            if (url.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
                return 'font';
            }
            
            return 'other';
        }
        
        const resources = [];
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        const resourceEntries = performance.getEntriesByType('resource');
        
        // ナビゲーション情報を追加
        if (navigationEntry) {
            resources.push({
                name: getResourceName(navigationEntry.name),
                url: navigationEntry.name,
                type: 'document',
                startTime: navigationEntry.startTime,
                endTime: navigationEntry.loadEventEnd,
                duration: navigationEntry.loadEventEnd - navigationEntry.startTime,
                size: navigationEntry.transferSize || 0,
                status: 'success'
            });
        }
        
        // リソース情報を追加
        resourceEntries.forEach(entry => {
            resources.push({
                name: getResourceName(entry.name),
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
    }

    // リソース名の取得（URLからファイル名を抽出）
    static getResourceName(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.split('/').pop() || urlObj.hostname;
        } catch {
            return url;
        }
    }

    // リソースタイプの判定
    static getResourceType(entry) {
        const url = entry.name.toLowerCase();
        
        // クエリパラメータを除いたパスを取得
        const urlWithoutQuery = url.split('?')[0].split('#')[0];
        
        // 1. XHR/Fetchを最初にチェック
        if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
            return 'xmlhttprequest';
        }
        
        // 2. 画像ファイルを拡張子で判定（クエリパラメータを除外して判定）
        if (urlWithoutQuery.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|avif)$/)) {
            return 'image';
        }
        
        // 3. フォントファイルを拡張子で判定
        if (urlWithoutQuery.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
            return 'font';
        }
        
        // 4. JavaScript
        if (urlWithoutQuery.match(/\.(js|jsx|ts|tsx)$/) || entry.initiatorType === 'script') {
            return 'script';
        }
        
        // 5. CSS（拡張子で判定を優先）
        if (urlWithoutQuery.match(/\.css$/)) {
            return 'stylesheet';
        }
        
        // 6. その他のlinkタイプ（CSS以外の拡張子が明確でない場合のみ）
        if (entry.initiatorType === 'link') {
            return 'stylesheet';
        }
        
        return 'other';
    }

    // リソースデータの処理
    processResourceData(resourceData) {
        this.resources = resourceData;
        
        this.updateStatistics();
        this.applyCurrentFilter();
        this.sortAndDisplayResources();
        this.renderTimeline();
    }

    // 統計情報の更新
    updateStatistics() {
        const totalResources = this.resources.length;
        const totalSize = this.resources.reduce((sum, r) => sum + (r.size || 0), 0);
        const maxEndTime = Math.max(...this.resources.map(r => r.endTime || 0));
        const largestResource = this.resources.reduce((largest, current) => 
            (current.size || 0) > (largest.size || 0) ? current : largest, this.resources[0] || {});

        // リソース数の表示に制限の警告を追加
        let resourceCountText = totalResources.toString();
        if (totalResources >= 150) {
            resourceCountText += ' ⚠️';
            document.getElementById('totalResources').title = 'Performance APIの制限により、一部のリソースが表示されていない可能性があります。ブラウザのデフォルト制限は通常150-250個です。';
        } else {
            document.getElementById('totalResources').title = '';
        }

        document.getElementById('totalResources').textContent = resourceCountText;
        document.getElementById('totalSize').textContent = this.formatSize(totalSize);
        document.getElementById('loadTime').textContent = `${Math.round(maxEndTime)}ms`;
        document.getElementById('largestResource').textContent = largestResource.name || '-';
    }

    // フィルターの設定
    setFilter(filterType) {
        this.currentFilter = filterType;
        
        // フィルターボタンのアクティブ状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === filterType);
        });
        
        this.applyCurrentFilter();
        this.sortAndDisplayResources();
        this.renderTimeline();
    }

    // フィルターの適用
    applyCurrentFilter() {
        // まずタイプフィルターを適用
        let filtered;
        if (this.currentFilter === 'all') {
            filtered = [...this.resources];
        } else {
            filtered = this.resources.filter(resource => 
                resource.type === this.currentFilter
            );
            
            // デバッグログ（CSSフィルター時）
            if (this.currentFilter === 'stylesheet') {
                console.log('CSS Filter Debug:', {
                    currentFilter: this.currentFilter,
                    totalResources: this.resources.length,
                    filteredCount: filtered.length,
                    resourceTypes: this.resources.map(r => ({ name: r.name, type: r.type })).slice(0, 10),
                    filteredTypes: filtered.map(r => ({ name: r.name, type: r.type })).slice(0, 10)
                });
            }
        }
        
        // 次に検索クエリを適用
        if (this.searchQuery) {
            filtered = filtered.filter(resource => {
                const searchableText = [
                    resource.name,
                    resource.domain,
                    resource.type,
                    this.formatSize(resource.size)
                ].join(' ').toLowerCase();
                
                return searchableText.includes(this.searchQuery);
            });
        }
        
        this.filteredResources = filtered;
        
        // 選択されたリソースがフィルター結果に含まれていない場合は選択解除
        if (this.selectedResourceUrl && 
            !this.filteredResources.some(r => r.url === this.selectedResourceUrl)) {
            this.selectedResourceUrl = null;
            this.relatedResources = [];
            this.hideResourceDetails();
        }
    }

    // ソートして表示
    sortAndDisplayResources() {
        this.filteredResources.sort((a, b) => {
            let aValue = a[this.currentSort];
            let bValue = b[this.currentSort];
            
            // 文字列の場合は小文字で比較
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return this.sortAscending ? -1 : 1;
            if (aValue > bValue) return this.sortAscending ? 1 : -1;
            return 0;
        });
        
        this.renderResourceTable();
    }

    // リソーステーブルの描画
    renderResourceTable() {
        const tbody = document.getElementById('resourcesTableBody');
        
        if (this.filteredResources.length === 0) {
            tbody.innerHTML = `
                <tr class="placeholder-row">
                    <td colspan="8" class="placeholder-text">
                        ${this.currentFilter === 'all' ? 'リソース情報がありません' : `${this.currentFilter} タイプのリソースがありません`}
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredResources.map(resource => {
            const isSelected = this.selectedResourceUrl === resource.url;
            const isRelated = this.relatedResources.includes(resource.url);
            
            // 選択状態がある場合の関連性判定
            let relationshipClass = '';
            if (this.selectedResourceUrl) {
                if (isSelected) {
                    relationshipClass = 'selected';
                } else if (isRelated) {
                    relationshipClass = 'related';
                } else {
                    relationshipClass = 'unrelated';
                }
            }
            
            return `
                <tr data-url="${resource.url.replace(/"/g, '&quot;')}" 
                    class="${relationshipClass}" style="cursor: pointer;">
                    <td title="${resource.url}">${resource.name}</td>
                    <td>
                        <div class="resource-type">
                            <span class="type-icon ${resource.type}"></span>
                            ${this.getTypeDisplayName(resource.type)}
                        </div>
                    </td>
                    <td title="${resource.domain}">${resource.domain}</td>
                    <td class="size-value">${this.formatSize(resource.size, resource.isCachedResource)}</td>
                    <td>${Math.round(resource.startTime)}ms</td>
                    <td>${Math.round(resource.duration)}ms</td>
                    <td class="status-${resource.status}">${resource.status}</td>
                    <td class="cookies-cell ${(resource.cookies > 0) ? 'clickable-cookies' : ''}" 
                        data-url="${resource.url.replace(/"/g, '&quot;')}" 
                        data-cookies="${resource.cookies}" 
                        data-cookie-details="${(resource.cookieDetails || '').replace(/"/g, '&quot;')}"
                        ${(resource.cookies > 0) ? 'title="クリックしてCookie詳細を表示"' : ''}>
                        ${resource.cookies || 0}
                    </td>
                </tr>
            `;
        }).join('');
        
        // テーブル行にクリックイベントリスナーを追加
        this.addTableEventListeners();
    }

    // タイムラインの描画
    renderTimeline() {
        const timelineContent = document.getElementById('timelineContent');
        
        // タイムライン統計を更新
        this.updateTimelineStatistics();
        
        if (this.filteredResources.length === 0) {
            timelineContent.innerHTML = `
                <div class="timeline-placeholder">
                    ${this.currentFilter === 'all' ? 'リソース情報がありません' : `${this.currentFilter} タイプのリソースがありません`}
                </div>
            `;
            timelineContent.style.height = '160px';
            return;
        }
        
        // タイムラインの動的サイズ設定
        const maxEndTime = Math.max(...this.filteredResources.map(r => r.endTime || 0));
        const timelineContentHeight = Math.max(this.filteredResources.length * 36 + 16, 200);
        
        // 必要に応じてタイムラインを再描画するためのタイマーを設定
        setTimeout(() => {
            const timelineWidth = timelineContent.clientWidth - 16; // padding分を引く
            
            timelineContent.innerHTML = this.filteredResources.map((resource, index) => {
                const left = (resource.startTime / maxEndTime) * timelineWidth;
                const width = Math.max(((resource.endTime - resource.startTime) / maxEndTime) * timelineWidth, 2);
                const top = index * 36 + 8;
                const isSelected = this.selectedResourceUrl === resource.url;
                const isRelated = this.relatedResources.includes(resource.url);
                
                // 選択状態がある場合の関連性判定
                let relationshipClass = '';
                if (this.selectedResourceUrl) {
                    if (isSelected) {
                        relationshipClass = 'selected';
                    } else if (isRelated) {
                        relationshipClass = 'related';
                    } else {
                        relationshipClass = 'unrelated';
                    }
                }
                
                // ファイル名を適切に表示用に整形
                const displayName = this.getDisplayName(resource.name, width);
                
                return `
                    <div class="timeline-item ${resource.type} ${relationshipClass}" 
                         style="left: ${left}px; width: ${width}px; top: ${top}px;"
                         data-url="${resource.url}"
                         data-name="${resource.name.replace(/"/g, '&quot;')}"
                         data-domain="${resource.domain}"
                         data-duration="${Math.round(resource.duration)}">
                        ${displayName}
                    </div>
                `;
            }).join('');
            
            // タイムラインの高さを調整（コンテンツサイズに応じて）
            timelineContent.style.height = `${timelineContentHeight}px`;
            
            // タイムラインアイテムにイベントリスナーを追加
            this.addTimelineEventListeners();
            
            this.renderTimelineScale(maxEndTime);
        }, 10);
    }

    // ヘッダーツールチップのセットアップ
    setupHeaderTooltips() {
        const headers = document.querySelectorAll('.resources-table th[title]');
        
        headers.forEach(header => {
            // デフォルトのtitle属性を無効化
            const originalTitle = header.getAttribute('title');
            header.removeAttribute('title');
            
            header.addEventListener('mouseenter', (e) => {
                this.showHeaderTooltip(e, originalTitle);
            });
            
            header.addEventListener('mouseleave', () => {
                this.hideHeaderTooltip();
            });
        });
    }

    // ヘッダーツールチップ表示
    showHeaderTooltip(event, text) {
        let tooltip = document.getElementById('header-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'header-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-family: 'Segoe UI', sans-serif;
                pointer-events: none;
                z-index: 10000;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.2);
                max-width: 250px;
                line-height: 1.3;
            `;
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        
        // 即座に表示位置を計算（上部に表示）
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
    }

    // ヘッダーツールチップ非表示
    hideHeaderTooltip() {
        const tooltip = document.getElementById('header-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // テーブルイベントリスナーの追加
    addTableEventListeners() {
        const tableRows = document.querySelectorAll('#resourcesTableBody tr[data-url]');
        
        tableRows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Cookiesセルのクリックを除外
                if (e.target.classList.contains('clickable-cookies')) {
                    return;
                }
                
                const url = e.currentTarget.getAttribute('data-url');
                if (url) {
                    this.selectResource(url);
                }
            });
        });
        
        // Cookiesセルのクリックイベントを追加
        const cookiesCells = document.querySelectorAll('.clickable-cookies');
        cookiesCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.stopPropagation(); // 行選択を防ぐ
                const cookieDetails = e.target.getAttribute('data-cookie-details');
                const cookieCount = e.target.getAttribute('data-cookies');
                const url = e.target.getAttribute('data-url');
                
                this.showCookieDetails(url, cookieCount, cookieDetails);
            });
        });
    }

    // タイムラインイベントリスナーの追加
    addTimelineEventListeners() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        timelineItems.forEach(item => {
            // クリックイベント
            item.addEventListener('click', (e) => {
                const url = e.target.getAttribute('data-url');
                if (url) {
                    this.selectResource(url);
                }
            });
            
            // マウスオーバーイベント
            item.addEventListener('mouseenter', (e) => {
                const name = e.target.getAttribute('data-name');
                const domain = e.target.getAttribute('data-domain');
                const duration = e.target.getAttribute('data-duration');
                const tooltipText = `${name} (${duration}ms) - ${domain}`;
                this.showTooltip(e, tooltipText);
            });
            
            // マウスアウトイベント
            item.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    // タイムライン統計の更新
    updateTimelineStatistics() {
        if (this.filteredResources.length === 0) {
            document.getElementById('timelineResourceCount').textContent = '0';
            document.getElementById('timelineTotalSize').textContent = '0B';
            document.getElementById('timelineLoadTime').textContent = '0ms';
            document.getElementById('timelineLargestResource').textContent = '-';
            return;
        }
        
        const totalResources = this.filteredResources.length;
        const totalSize = this.filteredResources.reduce((sum, r) => sum + (r.size || 0), 0);
        const maxEndTime = Math.max(...this.filteredResources.map(r => r.endTime || 0));
        const largestResource = this.filteredResources.reduce((largest, current) => 
            (current.size || 0) > (largest.size || 0) ? current : largest, 
            this.filteredResources[0] || {}
        );
        
        // タイムライン統計を更新
        document.getElementById('timelineResourceCount').textContent = totalResources;
        document.getElementById('timelineTotalSize').textContent = this.formatSize(totalSize);
        document.getElementById('timelineLoadTime').textContent = `${Math.round(maxEndTime)}ms`;
        
        const largestResourceElement = document.getElementById('timelineLargestResource');
        largestResourceElement.textContent = largestResource.name || '-';
        
        // 最大リソースにクリック機能を追加
        if (largestResource.url) {
            largestResourceElement.style.cursor = 'pointer';
            largestResourceElement.style.textDecoration = 'underline';
            largestResourceElement.title = `クリックして選択: ${largestResource.url}`;
            
            // 既存のイベントリスナーを削除
            largestResourceElement.replaceWith(largestResourceElement.cloneNode(true));
            const newElement = document.getElementById('timelineLargestResource');
            
            newElement.addEventListener('click', () => {
                this.selectResource(largestResource.url);
            });
        } else {
            largestResourceElement.style.cursor = 'default';
            largestResourceElement.style.textDecoration = 'none';
            largestResourceElement.title = '';
        }
    }

    // タイムラインスケールの描画
    renderTimelineScale(maxTime) {
        const timelineScale = document.getElementById('timelineScale');
        const intervals = 10;
        const intervalTime = maxTime / intervals;
        
        timelineScale.innerHTML = '';
        for (let i = 0; i <= intervals; i++) {
            const time = i * intervalTime;
            const left = (i / intervals) * 100;
            
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                left: ${left}%;
                top: 0;
                font-size: 10px;
                color: #666;
            `;
            marker.textContent = `${Math.round(time)}ms`;
            timelineScale.appendChild(marker);
        }
    }

    // リソース選択機能
    selectResource(url) {
        // 同じリソースが選択された場合は選択解除
        if (this.selectedResourceUrl === url) {
            this.selectedResourceUrl = null;
            this.relatedResources = [];
            this.hideResourceDetails();
        } else {
            this.selectedResourceUrl = url;
            this.findRelatedResources(url);
            this.showResourceDetails(url);
            
            // 1秒後にスクロール
            setTimeout(() => {
                this.scrollToSelectedResource(url);
            }, 1000);
        }
        
        this.renderResourceTable();
        this.renderTimeline();
    }

    // 選択されたリソースまでスクロール
    scrollToSelectedResource(url) {
        const tableRow = document.querySelector(`tr[data-url="${url}"]`);
        if (tableRow) {
            tableRow.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // リソース詳細を非表示
    hideResourceDetails() {
        const detailsSection = document.getElementById('detailsSection');
        if (detailsSection) {
            detailsSection.style.display = 'none';
        }
    }

    // 関連リソースの検索
    findRelatedResources(url) {
        const selectedResource = this.resources.find(r => r.url === url);
        if (!selectedResource) {
            this.relatedResources = [];
            return;
        }

        this.relatedResources = this.resources
            .filter(resource => {
                if (resource.url === url) return false;
                
                // 同じドメインのリソース
                if (resource.domain === selectedResource.domain) return true;
                
                // 同じタイプのリソース
                if (resource.type === selectedResource.type) return true;
                
                // ファイル名が類似している
                const selectedName = selectedResource.name.toLowerCase();
                const resourceName = resource.name.toLowerCase();
                if (selectedName.includes(resourceName.split('.')[0]) || 
                    resourceName.includes(selectedName.split('.')[0])) return true;
                
                return false;
            })
            .map(r => r.url);
    }

    // ツールチップ表示
    showTooltip(event, text) {
        let tooltip = document.getElementById('timeline-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'timeline-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-family: 'Segoe UI', sans-serif;
                pointer-events: none;
                z-index: 10000;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.2);
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        
        // マウス位置に基づいてツールチップを配置
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const tooltipRect = tooltip.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 右端を超えないように調整
        let left = mouseX + 10;
        if (left + tooltipRect.width > windowWidth - 10) {
            left = mouseX - tooltipRect.width - 10;
        }
        
        // 下端を超えないように調整
        let top = mouseY - 35;
        if (top < 10) {
            top = mouseY + 20;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // ツールチップ非表示
    hideTooltip() {
        const tooltip = document.getElementById('timeline-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // リソース詳細の表示
    showResourceDetails(url) {
        const resource = this.resources.find(r => r.url === url);
        if (!resource) return;
        
        const detailsContent = document.getElementById('detailsContent');
        const detailsSection = document.getElementById('detailsSection');
        
        detailsContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <strong>URL:</strong><br>
                    <div style="word-break: break-all; margin-bottom: 8px;">${resource.url}</div>
                    
                    <strong>タイプ:</strong> ${this.getTypeDisplayName(resource.type)}<br>
                    <strong>ドメイン:</strong> ${resource.domain}<br>
                    <strong>ステータス:</strong> ${resource.status}<br>
                    <strong>サイズ:</strong> ${this.formatSize(resource.size, resource.isCachedResource)}
                </div>
                <div>
                    <strong>開始時刻:</strong> ${Math.round(resource.startTime)}ms<br>
                    <strong>終了時刻:</strong> ${Math.round(resource.endTime)}ms<br>
                    <strong>所要時間:</strong> ${Math.round(resource.duration)}ms<br>
                    <strong>転送サイズ:</strong> ${this.formatSize(resource.transferSize || 0)}<br>
                    <strong>エンコードサイズ:</strong> ${this.formatSize(resource.encodedBodySize || 0)}<br>
                    <strong>デコードサイズ:</strong> ${this.formatSize(resource.decodedBodySize || 0)}<br>
                    <strong>Cookies:</strong> ${resource.cookies || 0}個
                </div>
            </div>
        `;
        
        detailsSection.style.display = 'block';
    }

    // Cookie詳細の表示
    showCookieDetails(url, cookieCount, cookieDetails) {
        const detailsContent = document.getElementById('detailsContent');
        const detailsSection = document.getElementById('detailsSection');
        
        if (!cookieDetails || cookieCount == 0) {
            detailsContent.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px;">
                    <strong>Cookie情報</strong><br>
                    このリソースにはCookieが設定されていません。
                </div>
            `;
        } else {
            // Cookie文字列をパースして整理
            const cookies = cookieDetails.split(';').map(cookie => {
                const [name, ...valueParts] = cookie.trim().split('=');
                const value = valueParts.join('=');
                return { name: name.trim(), value: value?.trim() || '' };
            }).filter(cookie => cookie.name);
            
            const cookieRows = cookies.map((cookie, index) => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px; font-weight: 600; background: #f8f9fa;">${index + 1}</td>
                    <td style="padding: 8px; font-family: monospace; word-break: break-all;">${cookie.name}</td>
                    <td style="padding: 8px; font-family: monospace; word-break: break-all; max-width: 300px;">${cookie.value || '<空>'}</td>
                </tr>
            `).join('');
            
            detailsContent.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <strong>🍪 Cookie詳細情報</strong>
                        <small style="color: #666;">総数: ${cookieCount}個</small>
                    </div>
                    
                    <div style="margin-bottom: 8px; font-size: 11px; color: #666;">
                        <strong>ドメイン:</strong> ${new URL(url).hostname}
                    </div>
                    
                    <div style="max-height: 200px; overflow: auto; border: 1px solid #ddd; border-radius: 4px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background: #f0f0f0;">
                                    <th style="padding: 8px; text-align: left; width: 40px;">#</th>
                                    <th style="padding: 8px; text-align: left; min-width: 120px;">名前</th>
                                    <th style="padding: 8px; text-align: left;">値</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cookieRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-top: 8px; font-size: 10px; color: #999; text-align: center;">
                        💡 これらのCookieはページロード時に取得されたものです
                    </div>
                </div>
            `;
        }
        
        detailsSection.style.display = 'block';
    }

    // ファイル名の表示用整形（一定フォントサイズで飛び出し許可）
    getDisplayName(fullName, availableWidth) {
        if (!fullName) return '';
        
        // URLからファイル名を抽出
        let displayName = fullName;
        if (fullName.includes('/')) {
            displayName = fullName.split('/').pop();
        }
        
        // ファイル名をそのまま表示（幅制限なし）
        return displayName;
    }

    // ユーティリティメソッド
    formatSize(bytes, isCachedResource = false) {
        // CDN/クロスオリジンリソースの場合はcacheと表示
        if (isCachedResource && (!bytes || bytes === 0)) {
            return 'cache';
        }
        if (!bytes || bytes === 0) return '0B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + sizes[i];
    }

    getTypeDisplayName(type) {
        const names = {
            'document': 'HTML',
            'stylesheet': 'CSS',
            'script': 'JavaScript',
            'image': '画像',
            'font': 'フォント',
            'xmlhttprequest': 'XHR',
            'other': 'その他'
        };
        return names[type] || type;
    }

    // データのクリア
    clearResources() {
        this.resources = [];
        this.filteredResources = [];
        this.selectedResourceUrl = null;
        this.relatedResources = [];
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        this.updateStatistics();
        this.renderResourceTable();
        this.renderTimeline();
        this.hideResourceDetails();
    }

    // データのエクスポート
    exportData() {
        // 時間単位を秒に変換したデータを作成
        const exportData = this.resources.map(resource => ({
            ...resource,
            startTime: Math.round((resource.startTime / 1000) * 1000) / 1000, // ミリ秒から秒に変換（小数点3桁）
            endTime: Math.round((resource.endTime / 1000) * 1000) / 1000,
            duration: Math.round((resource.duration / 1000) * 1000) / 1000,
            exportInfo: {
                exportedAt: new Date().toISOString(),
                timeUnit: "seconds",
                note: "All time values are in seconds. Duration = endTime - startTime"
            }
        }));
        
        // エクスポートデータのメタ情報を追加
        const exportObject = {
            metadata: {
                tool: "R kit - Resource Monitor Extension",
                version: "1.0.0",
                exportedAt: new Date().toISOString(),
                resourceCount: this.resources.length,
                description: "Web page resource loading data export"
            },
            timeUnit: "seconds",
            fieldDescriptions: {
                name: "リソースファイル名（URLから抽出）",
                url: "リソースの完全URL",
                domain: "リソースのドメイン名",
                type: "リソースタイプ（document, stylesheet, script, image, font, xmlhttprequest, other）",
                startTime: "リソース読み込み開始時刻（秒）",
                endTime: "リソース読み込み終了時刻（秒）",
                duration: "読み込み所要時間（endTime - startTime）（秒）",
                size: "リソースサイズ（優先順位：transferSize > encodedBodySize > decodedBodySize）（バイト）",
                transferSize: "ネットワーク転送サイズ（バイト）",
                encodedBodySize: "エンコード済みボディサイズ（バイト）",
                decodedBodySize: "デコード済みボディサイズ（バイト）",
                status: "読み込み状態（success/error）",
                cookies: "関連するCookieの数",
                cookieDetails: "Cookie詳細文字列（document.cookieから取得）"
            },
            resources: exportData
        };
        
        const dataStr = JSON.stringify(exportObject, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `r-kit-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // エラーメッセージの表示
    showErrorMessage(message) {
        const tbody = document.getElementById('resourcesTableBody');
        tbody.innerHTML = `
            <tr class="placeholder-row">
                <td colspan="8" class="placeholder-text" style="color: #dc3545;">
                    エラー: ${message}
                </td>
            </tr>
        `;
    }

    // データなしメッセージの表示
    showNoDataMessage() {
        const tbody = document.getElementById('resourcesTableBody');
        tbody.innerHTML = `
            <tr class="placeholder-row">
                <td colspan="8" class="placeholder-text">
                    ページのリソース情報を取得できませんでした。<br>
                    ページを更新してから再度お試しください。
                </td>
            </tr>
        `;
    }
}

// パネル初期化
let resourceMonitor;

// DevToolsパネルから呼び出される初期化関数
function initializePanel() {
    resourceMonitor = new ResourceMonitor();
}

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', () => {
    resourceMonitor = new ResourceMonitor();
});

// グローバルに公開（devtools.jsから呼び出すため）
window.initializePanel = initializePanel;
window.resourceMonitor = resourceMonitor;