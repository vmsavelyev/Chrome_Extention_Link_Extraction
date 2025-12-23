// Обработка сообщений от background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'copy-to-clipboard') {
    copyToClipboard(message.text).then((success) => {
      sendResponse({ success: success });
    });
    return true; // Асинхронный ответ
  }
});

// Копирование текста в буфер обмена
async function copyToClipboard(text) {
  // Метод 1: Clipboard API
  try {
    await navigator.clipboard.writeText(text);
    console.log('Clipboard API succeeded');
    return true;
  } catch (e) {
    console.log('Clipboard API failed:', e.message);
  }

  // Метод 2: execCommand с фокусом
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    console.log('execCommand result:', success);

    document.body.removeChild(textarea);

    if (success) return true;
  } catch (e) {
    console.log('execCommand failed:', e.message);
  }

  return false;
}
