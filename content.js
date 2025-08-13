// ChatGPT Navigator Content Script
class ChatGPTNavigator {
  constructor() {
    this.sidebar = null;
    this.isCollapsed = false;
    this.prompts = [];
    this.pinnedPrompts = this.loadPinnedPromptsForCurrentChat();
    this.observer = null;
    this.searchTerm = '';
    this.currentChatId = this.getCurrentChatId();
    this.init();
  }

  init() {
    // Wait for page to load completely
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createSidebar());
    } else {
      this.createSidebar();
    }
  }

  getCurrentChatId() {
    // Extract chat ID from URL like https://chatgpt.com/c/6898f7d8-4b04-832d-992b-03c8fd267b65
    const url = window.location.href;
    const match = url.match(/\/c\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  isChatOpen() {
    return this.getCurrentChatId() !== null;
  }

  loadPinnedPromptsForCurrentChat() {
    const chatId = this.getCurrentChatId();
    if (!chatId) return [];
    const allPinnedChats = JSON.parse(localStorage.getItem('chatgpt-nav-pinned-chats') || '{}');
    return allPinnedChats[chatId] || [];
  }

  savePinnedPromptsForCurrentChat() {
    const chatId = this.getCurrentChatId();
    if (!chatId) return;
    const allPinnedChats = JSON.parse(localStorage.getItem('chatgpt-nav-pinned-chats') || '{}');
    allPinnedChats[chatId] = this.pinnedPrompts;
    localStorage.setItem('chatgpt-nav-pinned-chats', JSON.stringify(allPinnedChats));
  }

  createSidebar() {
    // Remove existing sidebar and floating button if they exist
    const existingSidebar = document.getElementById('chatgpt-navigator-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }
    const existingFloatingButton = document.getElementById('chatgpt-nav-floating-button');
    if (existingFloatingButton) {
      existingFloatingButton.remove();
    }

    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'chatgpt-navigator-sidebar';
    this.sidebar.className = 'chatgpt-nav-sidebar';

    // Create sidebar content safely
    this.createSidebarContent();

    // Add sidebar to page
    document.body.appendChild(this.sidebar);

    // Create floating toggle button
    this.createFloatingButton();

    // Add event listeners
    this.setupEventListeners();

    // Start observing for new messages
    this.startObserving();

    // Initial scan for existing prompts
    setTimeout(() => this.scanForPrompts(), 1000);
  }

  createSidebarContent() {
    // Create header
    const header = document.createElement('div');
    header.className = 'chatgpt-nav-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Chat Navigation';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'chatgpt-nav-toggle';
    toggleBtn.id = 'chatgpt-nav-toggle';
    
    const toggleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    toggleSvg.setAttribute('width', '16');
    toggleSvg.setAttribute('height', '15');
    toggleSvg.setAttribute('viewBox', '0 0 16 15');
    toggleSvg.setAttribute('fill', 'none');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0.727273');
    rect.setAttribute('y', '0.727273');
    rect.setAttribute('width', '14.5455');
    rect.setAttribute('height', '12.8485');
    rect.setAttribute('rx', '3.15151');
    rect.setAttribute('stroke', '#AFAFAF');
    rect.setAttribute('stroke-width', '1.45455');
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5.57639');
    line.setAttribute('y1', '1.45508');
    line.setAttribute('x2', '5.57639');
    line.setAttribute('y2', '12.849');
    line.setAttribute('stroke', '#AFAFAF');
    line.setAttribute('stroke-width', '1.45455');
    
    toggleSvg.appendChild(rect);
    toggleSvg.appendChild(line);
    toggleBtn.appendChild(toggleSvg);
    
    header.appendChild(title);
    header.appendChild(toggleBtn);
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'chatgpt-nav-content';
    
    // Create search section
    const search = document.createElement('div');
    search.className = 'chatgpt-nav-search';
    
    const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    searchIcon.setAttribute('class', 'search-icon');
    searchIcon.setAttribute('width', '16');
    searchIcon.setAttribute('height', '16');
    searchIcon.setAttribute('viewBox', '0 0 24 24');
    searchIcon.setAttribute('fill', 'none');
    searchIcon.setAttribute('stroke', 'currentColor');
    searchIcon.setAttribute('stroke-width', '2');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm21 21-4.35-4.35');
    
    searchIcon.appendChild(circle);
    searchIcon.appendChild(path);
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search chats...';
    searchInput.id = 'chatgpt-nav-search-input';
    searchInput.className = 'search-input';
    
    search.appendChild(searchIcon);
    search.appendChild(searchInput);
    
    // Create pinned section
    const pinned = document.createElement('div');
    pinned.className = 'chatgpt-nav-pinned';
    pinned.id = 'chatgpt-nav-pinned';
    
    // Create prompts section
    const prompts = document.createElement('div');
    prompts.className = 'chatgpt-nav-prompts';
    prompts.id = 'chatgpt-nav-prompts';
    
    if (this.isChatOpen()) {
      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.textContent = 'Loading prompts...';
      prompts.appendChild(loading);
    } else {
      prompts.appendChild(this.createNoChatMessage());
    }
    
    content.appendChild(search);
    content.appendChild(pinned);
    content.appendChild(prompts);
    
    this.sidebar.appendChild(header);
    this.sidebar.appendChild(content);
  }

  createFloatingButton() {
    const floatingButton = document.createElement('button');
    floatingButton.id = 'chatgpt-nav-floating-button';
    floatingButton.className = 'chatgpt-nav-floating-button';
    
    // Create SVG safely
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '15');
    svg.setAttribute('viewBox', '0 0 16 15');
    svg.setAttribute('fill', 'none');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0.727273');
    rect.setAttribute('y', '0.727273');
    rect.setAttribute('width', '14.5455');
    rect.setAttribute('height', '12.8485');
    rect.setAttribute('rx', '3.15151');
    rect.setAttribute('stroke', 'currentColor');
    rect.setAttribute('stroke-width', '1.45455');
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5.57639');
    line.setAttribute('y1', '1.45508');
    line.setAttribute('x2', '5.57639');
    line.setAttribute('y2', '12.849');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '1.45455');
    
    svg.appendChild(rect);
    svg.appendChild(line);
    floatingButton.appendChild(svg);

    floatingButton.addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.body.appendChild(floatingButton);

    // Show floating button if sidebar is collapsed
    if (this.isCollapsed) {
      floatingButton.classList.add('show');
    }
  }

  setupEventListeners() {
    // Toggle sidebar
    const toggleBtn = document.getElementById('chatgpt-nav-toggle');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // Search functionality
    const searchInput = document.getElementById('chatgpt-nav-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterPrompts();
    });

    // Handle clicks outside sidebar to close on mobile
    document.addEventListener('click', (e) => {
      if (!this.sidebar.contains(e.target) && window.innerWidth <= 768) {
        this.collapseSidebar();
      }
    });
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    const toggleBtn = document.getElementById('chatgpt-nav-toggle');
    const toggleIcon = toggleBtn.querySelector('svg');
    const floatingButton = document.getElementById('chatgpt-nav-floating-button');

    if (this.isCollapsed) {
      this.sidebar.classList.add('collapsed');
      // Rotate icon 180 degrees when collapsed
      toggleIcon.style.transform = 'rotate(180deg)';
      // Show floating button
      if (floatingButton) {
        floatingButton.classList.add('show');
      }
    } else {
      this.sidebar.classList.remove('collapsed');
      // Reset icon rotation when expanded
      toggleIcon.style.transform = 'rotate(0deg)';
      // Hide floating button
      if (floatingButton) {
        floatingButton.classList.remove('show');
      }
    }
  }

  collapseSidebar() {
    this.isCollapsed = true;
    this.sidebar.classList.add('collapsed');
    const toggleBtn = document.getElementById('chatgpt-nav-toggle');
    const toggleIcon = toggleBtn.querySelector('svg');
    const floatingButton = document.getElementById('chatgpt-nav-floating-button');

    toggleIcon.style.transform = 'rotate(180deg)';

    // Show floating button
    if (floatingButton) {
      floatingButton.classList.add('show');
    }
  }

  startObserving() {
    // Observe changes in the chat container
    const chatContainer = document.querySelector('[role="main"]') ||
      document.querySelector('.conversation-turns') ||
      document.body;

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new message was added
              if (node.matches && (
                node.matches('[data-message-author-role="user"]') ||
                node.querySelector('[data-message-author-role="user"]') ||
                node.matches('.group') ||
                node.querySelector('.group')
              )) {
                shouldRescan = true;
              }
            }
          });
        }
      });

      if (shouldRescan) {
        setTimeout(() => this.scanForPrompts(), 500);
      }
    });

    this.observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  }

  scanForPrompts() {
    // Only scan for prompts if a chat is open
    if (!this.isChatOpen()) {
      const promptsContainer = document.getElementById('chatgpt-nav-prompts');
      const pinnedContainer = document.getElementById('chatgpt-nav-pinned');
      
      // Clear existing content safely
      while (promptsContainer.firstChild) {
        promptsContainer.removeChild(promptsContainer.firstChild);
      }
      
      // Clear pinned prompts section
      while (pinnedContainer.firstChild) {
        pinnedContainer.removeChild(pinnedContainer.firstChild);
      }
      pinnedContainer.style.display = 'none';
      
      promptsContainer.appendChild(this.createNoChatMessage());
      return;
    }

    // Different selectors for different ChatGPT layouts
    const promptSelectors = [
      '[data-message-author-role="user"]',
      '.group.w-full.text-token-text-primary:has([data-message-author-role="user"])',
      '.group:has(.text-base):has(.whitespace-pre-wrap):first-child',
      '.flex.flex-col.items-start.gap-4.whitespace-pre-wrap [data-message-author-role="user"]'
    ];

    let userMessages = [];

    for (const selector of promptSelectors) {
      userMessages = document.querySelectorAll(selector);
      if (userMessages.length > 0) break;
    }

    // Fallback: look for common patterns in ChatGPT messages
    if (userMessages.length === 0) {
      const allGroups = document.querySelectorAll('.group, [class*="message"], [class*="turn"]');
      userMessages = Array.from(allGroups).filter(el => {
        const text = el.textContent.trim();
        const hasUserIndicator = el.querySelector('[title*="user"], [alt*="user"], .user') ||
          el.textContent.includes('You:') ||
          el.getAttribute('data-message-author-role') === 'user';
        return text.length > 0 && (hasUserIndicator || this.looksLikeUserMessage(el));
      });
    }

    this.updatePromptsList(Array.from(userMessages));
  }

  looksLikeUserMessage(element) {
    // Heuristic to identify user messages based on common patterns
    const parent = element.closest('.group, [class*="message"]');
    if (!parent) return false;

    // Look for patterns that suggest this is a user message
    const hasAvatarPattern = parent.querySelector('img[src*="avatar"], [class*="avatar"]');
    const position = Array.from(parent.parentNode.children).indexOf(parent);

    // User messages often appear in odd positions (0, 2, 4, etc.) in many chat layouts
    return position % 2 === 0;
  }

  updatePromptsList(messageElements) {
    const promptsContainer = document.getElementById('chatgpt-nav-prompts');

    if (messageElements.length === 0) {
      // Clear existing content safely
      while (promptsContainer.firstChild) {
        promptsContainer.removeChild(promptsContainer.firstChild);
      }
      const noPrompts = document.createElement('div');
      noPrompts.className = 'no-prompts';
      noPrompts.textContent = 'No prompts found';
      promptsContainer.appendChild(noPrompts);
      return;
    }

    // Clear existing prompts safely
    while (promptsContainer.firstChild) {
      promptsContainer.removeChild(promptsContainer.firstChild);
    }

    messageElements.forEach((element, index) => {
      const promptText = this.extractPromptText(element);
      if (promptText.trim()) {
        const promptItem = this.createPromptItem(promptText, element, index + 1);
        promptsContainer.appendChild(promptItem);
      }
    });

    // Update pinned prompts section
    this.updatePinnedPrompts();
    
    // Update pin status for all items after creating them
    this.updatePromptsPinStatus();
  }

  filterPrompts() {
    const promptsContainer = document.getElementById('chatgpt-nav-prompts');
    const allPromptItems = promptsContainer.querySelectorAll('.chatgpt-nav-prompt-item');

    allPromptItems.forEach(item => {
      const text = item.querySelector('.prompt-text').textContent.toLowerCase();
      if (text.includes(this.searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  updatePinnedPrompts() {
    const pinnedContainer = document.getElementById('chatgpt-nav-pinned');
    
    // Clear existing content safely
    while (pinnedContainer.firstChild) {
      pinnedContainer.removeChild(pinnedContainer.firstChild);
    }

    if (this.pinnedPrompts.length === 0) {
      pinnedContainer.style.display = 'none';
      return;
    }

    pinnedContainer.style.display = 'block';

    // Add pinned section header
    const header = document.createElement('div');
    header.className = 'pinned-header';
    header.textContent = 'Pinned Chats';
    pinnedContainer.appendChild(header);

    this.pinnedPrompts.forEach((pinnedPrompt, index) => {
      const item = this.createPinnedPromptItem(pinnedPrompt.text, pinnedPrompt.number, true);
      pinnedContainer.appendChild(item);
    });
  }

  togglePin(promptText, element, number) {
    const existingIndex = this.pinnedPrompts.findIndex(p => p.text === promptText);

    if (existingIndex !== -1) {
      // Unpin
      this.pinnedPrompts.splice(existingIndex, 1);
    } else if (this.pinnedPrompts.length < 3) {
      // Pin (max 3 per chat) - store text and number, not element reference
      this.pinnedPrompts.push({ text: promptText, number });
    } else {
      // Already have 3 pinned, show message
      this.showMessage('Maximum 3 chats can be pinned per conversation');
      return;
    }

    // Save to localStorage per chat
    this.savePinnedPromptsForCurrentChat();

    this.updatePinnedPrompts();
    this.updatePromptsPinStatus();
  }

  updatePromptsPinStatus() {
    const promptsContainer = document.getElementById('chatgpt-nav-prompts');
    const allPromptItems = promptsContainer.querySelectorAll('.chatgpt-nav-prompt-item:not(.pinned-item)');

    allPromptItems.forEach(item => {
      const text = item.querySelector('.prompt-text').textContent;
      const pinBtn = item.querySelector('.pin-button');
      const isPinned = this.pinnedPrompts.some(p => p.text === text);

      if (pinBtn) {
        // Clear existing content
        while (pinBtn.firstChild) {
          pinBtn.removeChild(pinBtn.firstChild);
        }
        
        // Create pin icon safely
        const pinSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pinSvg.setAttribute('width', '14');
        pinSvg.setAttribute('height', '14');
        pinSvg.setAttribute('viewBox', '0 0 24 24');
        pinSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pinPath.setAttribute('d', 'M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z');
        
        if (isPinned) {
          pinSvg.setAttribute('fill', 'currentColor');
          pinSvg.setAttribute('stroke', 'none');
        } else {
          pinSvg.setAttribute('fill', 'none');
          pinSvg.setAttribute('stroke', 'currentColor');
          pinSvg.setAttribute('stroke-width', '2');
        }
        
        pinSvg.appendChild(pinPath);
        pinBtn.appendChild(pinSvg);

        pinBtn.title = isPinned ? 'Unpin chat' : 'Pin chat';
        pinBtn.classList.toggle('pinned', isPinned);
      }
    });
  }

  showMessage(message) {
    // Create temporary message overlay
    const messageDiv = document.createElement('div');
    messageDiv.className = 'nav-message';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 2000);
  }

  extractPromptText(element) {
    // Get the text content, handling various ChatGPT layouts
    let text = '';

    // Try to find the actual message content
    const contentSelectors = [
      '.whitespace-pre-wrap',
      '[data-message-author-role="user"] + div',
      '.prose',
      'p',
      '.text-base'
    ];

    for (const selector of contentSelectors) {
      const contentEl = element.querySelector(selector);
      if (contentEl && contentEl.textContent.trim()) {
        text = contentEl.textContent.trim();
        break;
      }
    }

    // Fallback to element's text content
    if (!text) {
      text = element.textContent.trim();
    }

    // Clean up the text
    text = text.replace(/^(You:|User:)/i, '').trim();

    // Truncate if too long
    if (text.length > 100) {
      text = text.substring(0, 97) + '...';
    }

    return text;
  }

  createPromptItem(text, element, number, isPinned = false) {
    const item = document.createElement('div');
    item.className = 'chatgpt-nav-prompt-item';

    // Create prompt number
    const numberDiv = document.createElement('div');
    numberDiv.className = 'prompt-number';
    numberDiv.textContent = number;

    // Create prompt text
    const textDiv = document.createElement('div');
    textDiv.className = 'prompt-text';
    textDiv.textContent = text;

    // Create pin button
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button';
    pinButton.title = isPinned ? 'Unpin chat' : 'Pin chat';
    
    const pinSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pinSvg.setAttribute('width', '14');
    pinSvg.setAttribute('height', '14');
    pinSvg.setAttribute('viewBox', '0 0 24 24');
    pinSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pinPath.setAttribute('d', 'M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z');
    
    if (isPinned) {
      pinSvg.setAttribute('fill', 'currentColor');
    } else {
      pinSvg.setAttribute('fill', 'none');
      pinSvg.setAttribute('stroke', 'currentColor');
      pinSvg.setAttribute('stroke-width', '2');
    }
    
    pinSvg.appendChild(pinPath);
    pinButton.appendChild(pinSvg);

    // Assemble the item
    item.appendChild(numberDiv);
    item.appendChild(textDiv);
    item.appendChild(pinButton);

    item.addEventListener('click', () => {
      this.scrollToElement(element);
      // Collapse sidebar on mobile after clicking
      if (window.innerWidth <= 768) {
        this.collapseSidebar();
      }
    });

    // Pin button functionality
    pinButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(text, element, number);
    });

    return item;
  }

  createPinnedPromptItem(text, number, isPinned = true) {
    const item = document.createElement('div');
    item.className = 'chatgpt-nav-prompt-item pinned-item';

    // Create prompt number
    const numberDiv = document.createElement('div');
    numberDiv.className = 'prompt-number';
    numberDiv.textContent = number;

    // Create prompt text
    const textDiv = document.createElement('div');
    textDiv.className = 'prompt-text';
    textDiv.textContent = text;

    // Create pin button
    const pinButton = document.createElement('button');
    pinButton.className = 'pin-button pinned';
    pinButton.title = 'Unpin chat';
    
    const pinSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pinSvg.setAttribute('width', '14');
    pinSvg.setAttribute('height', '14');
    pinSvg.setAttribute('viewBox', '0 0 24 24');
    pinSvg.setAttribute('fill', 'currentColor');
    pinSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pinPath.setAttribute('d', 'M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z');
    
    pinSvg.appendChild(pinPath);
    pinButton.appendChild(pinSvg);

    // Assemble the item
    item.appendChild(numberDiv);
    item.appendChild(textDiv);
    item.appendChild(pinButton);

    item.addEventListener('click', () => {
      // Find the current element by its prompt number
      const element = this.findElementByPromptNumber(number);
      if (element) {
        this.scrollToElement(element);
      } else {
        this.showMessage('Could not find the corresponding chat message');
      }
      // Collapse sidebar on mobile after clicking
      if (window.innerWidth <= 768) {
        this.collapseSidebar();
      }
    });

    // Pin button functionality
    pinButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(text, null, number);
    });

    return item;
  }

  findElementByPromptNumber(targetNumber) {
    // Re-scan current messages to find the element at the target position
    const promptSelectors = [
      '[data-message-author-role="user"]',
      '.group.w-full.text-token-text-primary:has([data-message-author-role="user"])',
      '.group:has(.text-base):has(.whitespace-pre-wrap):first-child',
      '.flex.flex-col.items-start.gap-4.whitespace-pre-wrap [data-message-author-role="user"]'
    ];

    let userMessages = [];

    for (const selector of promptSelectors) {
      userMessages = document.querySelectorAll(selector);
      if (userMessages.length > 0) break;
    }

    // Fallback: look for common patterns in ChatGPT messages
    if (userMessages.length === 0) {
      const allGroups = document.querySelectorAll('.group, [class*="message"], [class*="turn"]');
      userMessages = Array.from(allGroups).filter(el => {
        const text = el.textContent.trim();
        const hasUserIndicator = el.querySelector('[title*="user"], [alt*="user"], .user') ||
          el.textContent.includes('You:') ||
          el.getAttribute('data-message-author-role') === 'user';
        return text.length > 0 && (hasUserIndicator || this.looksLikeUserMessage(el));
      });
    }

    // Return the element at the target number position (1-indexed)
    const elementIndex = targetNumber - 1;
    return userMessages[elementIndex] || null;
  }

  scrollToElement(element) {
    // Check if element is valid and has scrollIntoView method
    if (!element || typeof element.scrollIntoView !== 'function') {
      console.warn('Invalid element or scrollIntoView not available');
      return;
    }

    // Smooth scroll to the element
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }

  createNoChatMessage() {
    const container = document.createElement('div');
    container.className = 'no-chat-message';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'no-chat-icon';
    
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('width', '32');
    iconSvg.setAttribute('height', '32');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'm3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z');
    
    iconSvg.appendChild(iconPath);
    iconDiv.appendChild(iconSvg);
    
    const title = document.createElement('div');
    title.className = 'no-chat-title';
    title.textContent = 'No Chat Open';
    
    const subtitle = document.createElement('div');
    subtitle.className = 'no-chat-subtitle';
    subtitle.textContent = 'Open a conversation to navigate through your prompts and responses';
    
    container.appendChild(iconDiv);
    container.appendChild(title);
    container.appendChild(subtitle);
    
    return container;
  }
}

// Initialize the navigator when the script loads
let navigator;

function initNavigator() {
  // Check if we're on ChatGPT
  if (window.location.hostname.includes('openai.com') ||
    window.location.hostname.includes('chatgpt.com')) {
    navigator = new ChatGPTNavigator();
  }
}

// Initialize immediately if page is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigator);
} else {
  initNavigator();
}

// Handle navigation events (for SPA routing)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      if (navigator) {
        // Check if we switched to a different chat
        const newChatId = navigator.getCurrentChatId();
        if (newChatId !== navigator.currentChatId) {
          navigator.currentChatId = newChatId;
          navigator.pinnedPrompts = navigator.loadPinnedPromptsForCurrentChat();
        }
        navigator.scanForPrompts();
      }
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });