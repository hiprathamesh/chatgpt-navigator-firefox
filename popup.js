// Popup script for ChatGPT Navigator
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const reloadBtn = document.getElementById('reload-btn');
  const helpLink = document.getElementById('help-link');

  // Check if we're on a ChatGPT page
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;
    const statusDot = document.getElementById('status-dot');
    
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
      // We're on ChatGPT
      statusElement.className = 'status active';
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Active on ChatGPT';
      
      // Check if extension is working by injecting a test script
      browser.tabs.executeScript(currentTab.id, {
        code: 'document.getElementById("chatgpt-navigator-sidebar") ? "working" : "not-working"'
      }).then(function(result) {
        if (result && result[0] === 'working') {
          statusText.textContent = 'Active on ChatGPT';
        } else {
          statusText.textContent = 'Extension loading...';
          // Try to reload the content script
          reloadContentScript(currentTab.id);
        }
      }).catch(function(error) {
        statusElement.className = 'status inactive';
        statusDot.className = 'status-dot inactive';
        statusText.textContent = 'Extension needs reload';
        reloadBtn.style.display = 'inline-block';
      });
    } else {
      // Not on ChatGPT
      statusElement.className = 'status inactive';
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Not on ChatGPT';
    }
  });

  // Reload button functionality
  reloadBtn.addEventListener('click', function() {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
      reloadContentScript(tabs[0].id);
      statusText.textContent = '🔄 Reloading extension...';
      reloadBtn.style.display = 'none';
      
      setTimeout(() => {
        window.close();
      }, 1000);
    });
  });

  // Help link functionality
  helpLink.addEventListener('click', function(e) {
    e.preventDefault();
    showHelp();
  });

  function reloadContentScript(tabId) {
    browser.tabs.executeScript(tabId, {
      code: `
        // Remove existing sidebar
        const existing = document.getElementById('chatgpt-navigator-sidebar');
        if (existing) existing.remove();
        
        // Clear any existing observers
        if (window.chatGPTNavigator && window.chatGPTNavigator.observer) {
          window.chatGPTNavigator.observer.disconnect();
        }
      `
    }).then(function() {
      // Re-inject the content script
      browser.tabs.executeScript(tabId, {file: 'content.js'});
    }).catch(console.error);
  }

  function showHelp() {
    // Replace the popup content with help instructions
    document.querySelector('.container').innerHTML = `
      <div class="header">
        <h1>How to Use</h1>
        <p>ChatGPT Navigator Setup</p>
      </div>
      
      <div style="padding: 0 0 20px 0; color: white; line-height: 1.6;">
        <div style="margin-bottom: 15px;">
          <strong>1. Visit ChatGPT</strong><br>
          <span style="font-size: 12px; opacity: 0.8;">Go to chat.openai.com or chatgpt.com</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>2. Start a conversation</strong><br>
          <span style="font-size: 12px; opacity: 0.8;">Ask questions and chat normally</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>3. Click the floating button</strong><br>
          <span style="font-size: 12px; opacity: 0.8;">A floating button will appear at the bottom-right corner</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>4. Navigate quickly</strong><br>
          <span style="font-size: 12px; opacity: 0.8;">Click any prompt in the sidebar to jump to it</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>5. Toggle sidebar</strong><br>
          <span style="font-size: 12px; opacity: 0.8;">Click the button again to collapse/expand</span>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <button id="back-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
          ← Back to Main
        </button>
      </div>
    `;
    
    // Add back button functionality
    document.getElementById('back-btn').addEventListener('click', function() {
      location.reload();
    });
  }
});