// DevTools パネルを作成
chrome.devtools.panels.create(
    'R kit',    // パネル名
    'icons/icon16.png',   // アイコン
    'panel.html',         // パネルのHTMLファイル
    function(panel) {
        console.log('Resource Monitor panel created');
        
        // パネルが表示/非表示になったときのイベントリスナー
        panel.onShown.addListener(function(panelWindow) {
            console.log('Resource Monitor panel shown');
            // パネルが表示された時の処理
            if (panelWindow.initializePanel) {
                panelWindow.initializePanel();
            }
        });
        
        panel.onHidden.addListener(function() {
            console.log('Resource Monitor panel hidden');
            // パネルが非表示になった時の処理
        });
    }
);