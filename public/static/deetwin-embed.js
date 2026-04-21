/**
 * DEETWIN Bot Embed Script
 * Usage: 
 * <script>window.DEETWIN_ORG_ID = 'your-org-id';</script>
 * <script src="https://your-domain.com/static/deetwin-embed.js"></script>
 */
(function() {
    const orgId = window.DEETWIN_ORG_ID || 'default-clinic';
    const baseUrl = window.DEETWIN_BASE_URL || window.location.origin;

    // Create Styles for the bubble
    const style = document.createElement('style');
    style.innerHTML = `
        #deetwin-bubble-host {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 64px;
            height: 64px;
            z-index: 2147483647;
        }
        .deetwin-bubble {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #000000;
            border: 1px solid #333333;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            color: white;
        }
        .deetwin-bubble:hover {
            transform: scale(1.1) translateY(-4px);
            border-color: #555555;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        }
        .deetwin-bubble svg {
            width: 32px;
            height: 32px;
        }
        .deetwin-iframe-container {
            position: fixed;
            bottom: 104px;
            right: 24px;
            width: 420px;
            height: 600px;
            max-width: calc(100vw - 48px);
            max-height: calc(100vh - 140px);
            border-radius: 24px;
            overflow: hidden;
            background: #000000;
            border: 1px solid #1a1a1a;
            box-shadow: 0 24px 64px rgba(0,0,0,0.8);
            z-index: 2147483646;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            display: none;
        }
        .deetwin-iframe-container.open {
            display: block;
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
    `;
    document.head.appendChild(style);

    // Create Host
    const host = document.createElement('div');
    host.id = 'deetwin-bubble-host';
    
    const bubble = document.createElement('div');
    bubble.className = 'deetwin-bubble';
    bubble.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        </svg>
    `;
    
    host.appendChild(bubble);
    document.body.appendChild(host);

    let container = null;
    let isOpen = false;

    bubble.onclick = function() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'deetwin-iframe-container';
            
            // Using Shadow DOM for style isolation
            const shadow = container.attachShadow({mode: 'open'});
            
            const iframe = document.createElement('iframe');
            iframe.src = `${baseUrl}/embed/${orgId}`;
            iframe.style.cssText = 'width:100%;height:100%;border:none;background:#000;color-scheme:dark;';
            
            shadow.appendChild(iframe);
            document.body.appendChild(container);
            
            // Small delay to trigger animation
            setTimeout(() => {
                container.classList.add('open');
                isOpen = true;
            }, 10);
        } else {
            if (isOpen) {
                container.classList.remove('open');
                setTimeout(() => { container.style.display = 'none'; }, 400);
            } else {
                container.style.display = 'block';
                setTimeout(() => { container.classList.add('open'); }, 10);
            }
            isOpen = !isOpen;
        }
    };
})();
