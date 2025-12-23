// Настройки по умолчанию
const defaultSettings = {
  format: 'list',
  useGrouping: true,
  showTitle: true,
  csvDelimiter: ',',
  language: 'ru'
};

// Переводы для background script
const translations = {
  ru: {
    noGroup: 'Без группы',
    untitled: 'Без названия'
  },
  en: {
    noGroup: 'No Group',
    untitled: 'Untitled'
  }
};

// Создание контекстного меню при установке расширения
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copy-selected-tabs',
    title: chrome.i18n.getMessage('contextMenuCopySelected'),
    contexts: ['action']
  });
});

// Обработка клика по пункту контекстного меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copy-selected-tabs') {
    await copySelectedTabs();
  }
});

// Основная функция копирования выделенных вкладок
async function copySelectedTabs() {
  try {
    // Загрузить настройки
    const settings = await loadSettings();

    // Получить выделенные вкладки
    const tabs = await chrome.tabs.query({
      highlighted: true,
      currentWindow: true
    });

    if (tabs.length === 0) {
      return;
    }

    // Подготовить данные вкладок с группами
    const tabsData = await prepareTabsData(tabs, settings.language);

    // Форматировать данные
    let text;
    if (settings.format === 'csv') {
      text = formatAsCSV(tabsData, settings);
    } else {
      text = formatAsList(tabsData, settings);
    }

    // Копировать в буфер обмена
    await copyToClipboard(text);

    // Показать badge уведомление
    showBadgeNotification();

  } catch (error) {
    console.error('Error copying tabs:', error);
  }
}

// Загрузка настроек из storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'format',
      'useGrouping',
      'showTitle',
      'csvDelimiter',
      'language'
    ]);
    return { ...defaultSettings, ...result };
  } catch (e) {
    return defaultSettings;
  }
}

// Подготовка данных вкладок (с группами)
async function prepareTabsData(tabs, language) {
  const groups = {};
  const ungroupedTabs = [];

  for (const tab of tabs) {
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      if (!groups[tab.groupId]) {
        groups[tab.groupId] = {
          groupName: '',
          tabs: []
        };
      }
      groups[tab.groupId].tabs.push({
        title: tab.title,
        url: tab.url
      });
    } else {
      ungroupedTabs.push({
        title: tab.title,
        url: tab.url
      });
    }
  }

  // Получить названия групп
  for (const groupId in groups) {
    try {
      const group = await chrome.tabGroups.get(parseInt(groupId));
      groups[groupId].groupName = group.title || translations[language]?.untitled || translations.ru.untitled;
    } catch (e) {
      groups[groupId].groupName = translations[language]?.untitled || translations.ru.untitled;
    }
  }

  return {
    groups: Object.values(groups),
    ungrouped: ungroupedTabs
  };
}

// Форматирование как список
function formatAsList(tabsData, settings) {
  const { useGrouping, showTitle, language } = settings;
  const noGroupText = translations[language]?.noGroup || translations.ru.noGroup;
  let output = '';

  if (useGrouping) {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        output += `${group.groupName}\n`;
        if (showTitle) {
          output += `${tab.title}\n`;
        }
        output += `${tab.url}\n`;
        output += `\n`;
      }
    }

    for (const tab of tabsData.ungrouped) {
      output += `${noGroupText}\n`;
      if (showTitle) {
        output += `${tab.title}\n`;
      }
      output += `${tab.url}\n`;
      output += `\n`;
    }
  } else {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        if (showTitle) {
          output += `${tab.title}\n`;
        }
        output += `${tab.url}\n`;
        output += `\n`;
      }
    }

    for (const tab of tabsData.ungrouped) {
      if (showTitle) {
        output += `${tab.title}\n`;
      }
      output += `${tab.url}\n`;
      output += `\n`;
    }
  }

  return output;
}

// Форматирование как CSV
function formatAsCSV(tabsData, settings) {
  const { useGrouping, showTitle, csvDelimiter, language } = settings;
  const noGroupText = translations[language]?.noGroup || translations.ru.noGroup;
  const d = csvDelimiter;
  let output = '';

  if (useGrouping) {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const groupName = escapeCSV(group.groupName, d);
        const url = escapeCSV(tab.url, d);
        if (showTitle) {
          const title = escapeCSV(tab.title, d);
          output += `${groupName}${d}${title}${d}${url}\n`;
        } else {
          output += `${groupName}${d}${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url, d);
      const noGroup = escapeCSV(noGroupText, d);
      if (showTitle) {
        const title = escapeCSV(tab.title, d);
        output += `${noGroup}${d}${title}${d}${url}\n`;
      } else {
        output += `${noGroup}${d}${url}\n`;
      }
    }
  } else {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const url = escapeCSV(tab.url, d);
        if (showTitle) {
          const title = escapeCSV(tab.title, d);
          output += `${title}${d}${url}\n`;
        } else {
          output += `${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url, d);
      if (showTitle) {
        const title = escapeCSV(tab.title, d);
        output += `${title}${d}${url}\n`;
      } else {
        output += `${url}\n`;
      }
    }
  }

  return output;
}

// Экранирование для CSV
function escapeCSV(text, delimiter) {
  if (text.includes(delimiter) || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Копирование в буфер обмена через Offscreen API
async function copyToClipboard(text) {
  try {
    // Создать offscreen document
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Copy tab URLs to clipboard'
      });
    } catch (e) {
      // Документ уже может существовать - это нормально
      if (!e.message.includes('single offscreen')) {
        throw e;
      }
    }

    // Небольшая задержка для инициализации offscreen document
    await new Promise(resolve => setTimeout(resolve, 50));

    // Отправить сообщение в offscreen document
    const response = await chrome.runtime.sendMessage({
      type: 'copy-to-clipboard',
      text: text
    });

    console.log('Copy response:', response);

    // Закрыть offscreen document после копирования
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {
      // Игнорировать ошибку если документ уже закрыт
    }

  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

// Показ badge уведомления
function showBadgeNotification() {
  chrome.action.setBadgeText({ text: '\u2713' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}
