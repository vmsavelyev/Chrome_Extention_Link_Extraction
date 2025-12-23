let currentFormat = 'list';
let useGrouping = true;
let showTitle = true;
let csvDelimiter = ',';
let tabsData = { groups: [], ungrouped: [] };
let selectedTabsData = { groups: [], ungrouped: [] };
let selectedTabsCount = 0;
let currentLang = 'ru';

// Локализации
const translations = {
  ru: {
    loading: 'Загрузка...',
    list: 'Список',
    csv: 'CSV',
    tabGroups: 'Группы вкладок',
    tabGroupsDesc: 'Отображать группировку вкладок',
    pageTitles: 'Заголовки страниц',
    pageTitlesDesc: 'Показывать названия страниц',
    csvDelimiter: 'Разделитель CSV',
    csvDelimiterDesc: 'Символ между значениями',
    comma: 'Запятая',
    semicolon: 'Точка с запятой',
    pipe: 'Вертикальная черта',
    result: 'Результат',
    copy: 'Копировать',
    copySelected: 'Выделенные',
    copyAll: 'Все',
    copied: 'Скопировано в буфер обмена',
    noGroup: 'Без группы',
    untitled: 'Без названия',
    tab_one: 'вкладка',
    tab_few: 'вкладки',
    tab_many: 'вкладок',
    group_one: 'группа',
    group_few: 'группы',
    group_many: 'групп',
    shortcutLabel: 'Горячая клавиша',
    configureShortcut: 'Настроить',
    notSet: 'Не задано'
  },
  en: {
    loading: 'Loading...',
    list: 'List',
    csv: 'CSV',
    tabGroups: 'Tab Groups',
    tabGroupsDesc: 'Display tab grouping',
    pageTitles: 'Page Titles',
    pageTitlesDesc: 'Show page titles',
    csvDelimiter: 'CSV Delimiter',
    csvDelimiterDesc: 'Character between values',
    comma: 'Comma',
    semicolon: 'Semicolon',
    pipe: 'Vertical bar',
    result: 'Result',
    copy: 'Copy',
    copySelected: 'Selected',
    copyAll: 'All',
    copied: 'Copied to clipboard',
    noGroup: 'No Group',
    untitled: 'Untitled',
    tab_one: 'tab',
    tab_few: 'tabs',
    tab_many: 'tabs',
    group_one: 'group',
    group_few: 'groups',
    group_many: 'groups',
    shortcutLabel: 'Keyboard shortcut',
    configureShortcut: 'Configure',
    notSet: 'Not set'
  }
};

function t(key) {
  return translations[currentLang][key] || translations['ru'][key] || key;
}

function applyTranslations(updateData = false) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key !== 'loading' || !tabsData.groups.length && !tabsData.ungrouped.length) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });

  if (updateData && (tabsData.groups.length || tabsData.ungrouped.length)) {
    updateTabCount();
    displayData();
  }
}

async function loadSavedSettings() {
  try {
    const result = await chrome.storage.local.get([
      'language',
      'format',
      'useGrouping',
      'showTitle',
      'csvDelimiter'
    ]);
    if (result.language) {
      currentLang = result.language;
    }
    if (result.format) {
      currentFormat = result.format;
    }
    if (result.useGrouping !== undefined) {
      useGrouping = result.useGrouping;
    }
    if (result.showTitle !== undefined) {
      showTitle = result.showTitle;
    }
    if (result.csvDelimiter) {
      csvDelimiter = result.csvDelimiter;
    }
  } catch (e) {
    currentLang = 'ru';
  }
}

async function saveLanguage(lang) {
  try {
    await chrome.storage.local.set({ language: lang });
  } catch (e) {
    console.error('Failed to save language:', e);
  }
}

function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedSettings();
  updateLangButtons();
  updateActiveButton();
  updateCsvOptionsVisibility();
  applyTranslations();

  // Применить загруженные настройки к UI
  document.getElementById('groupCheckbox').checked = useGrouping;
  document.getElementById('titleCheckbox').checked = showTitle;
  document.querySelectorAll('.delimiter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.delimiter === csvDelimiter);
  });

  await loadTabs();
  updateTabCount();
  displayData();

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentLang = btn.dataset.lang;
      await saveLanguage(currentLang);
      updateLangButtons();
      applyTranslations(true);
    });
  });

  document.getElementById('listBtn').addEventListener('click', async () => {
    currentFormat = 'list';
    updateActiveButton();
    updateCsvOptionsVisibility();
    displayData();
    await chrome.storage.local.set({ format: currentFormat });
  });

  document.getElementById('csvBtn').addEventListener('click', async () => {
    currentFormat = 'csv';
    updateActiveButton();
    updateCsvOptionsVisibility();
    displayData();
    await chrome.storage.local.set({ format: currentFormat });
  });

  document.querySelectorAll('.delimiter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.delimiter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      csvDelimiter = btn.dataset.delimiter;
      displayData();
      await chrome.storage.local.set({ csvDelimiter: csvDelimiter });
    });
  });

  document.getElementById('groupCheckbox').addEventListener('change', async (e) => {
    useGrouping = e.target.checked;
    displayData();
    await chrome.storage.local.set({ useGrouping: useGrouping });
  });

  document.getElementById('titleCheckbox').addEventListener('change', async (e) => {
    showTitle = e.target.checked;
    displayData();
    await chrome.storage.local.set({ showTitle: showTitle });
  });

  document.getElementById('copyBtn').addEventListener('click', () => {
    copyToClipboard();
  });

  document.getElementById('copySelectedBtn').addEventListener('click', () => {
    copySelectedToClipboard();
  });

  // Загрузить и отобразить горячую клавишу
  loadShortcut();

  // Кнопка настройки горячей клавиши
  document.getElementById('configureShortcutBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
});

async function loadTabs() {
  const currentWindow = await chrome.windows.getCurrent({ populate: true });
  const tabs = currentWindow.tabs;

  const groups = {};
  const ungroupedTabs = [];
  const selectedGroups = {};
  const selectedUngroupedTabs = [];

  // Подсчёт выделенных вкладок
  const highlightedTabs = tabs.filter(tab => tab.highlighted);
  selectedTabsCount = highlightedTabs.length;

  for (const tab of tabs) {
    const tabData = {
      title: tab.title,
      url: tab.url
    };

    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      if (!groups[tab.groupId]) {
        groups[tab.groupId] = {
          groupName: '',
          tabs: []
        };
      }
      groups[tab.groupId].tabs.push(tabData);

      // Для выделенных вкладок
      if (tab.highlighted) {
        if (!selectedGroups[tab.groupId]) {
          selectedGroups[tab.groupId] = {
            groupName: '',
            tabs: []
          };
        }
        selectedGroups[tab.groupId].tabs.push(tabData);
      }
    } else {
      ungroupedTabs.push(tabData);

      // Для выделенных вкладок
      if (tab.highlighted) {
        selectedUngroupedTabs.push(tabData);
      }
    }
  }

  for (const groupId in groups) {
    try {
      const group = await chrome.tabGroups.get(parseInt(groupId));
      const groupName = group.title || t('untitled');
      groups[groupId].groupName = groupName;
      if (selectedGroups[groupId]) {
        selectedGroups[groupId].groupName = groupName;
      }
    } catch (e) {
      groups[groupId].groupName = t('untitled');
      if (selectedGroups[groupId]) {
        selectedGroups[groupId].groupName = t('untitled');
      }
    }
  }

  tabsData = {
    groups: Object.values(groups),
    ungrouped: ungroupedTabs
  };

  selectedTabsData = {
    groups: Object.values(selectedGroups),
    ungrouped: selectedUngroupedTabs
  };

  // Показать/скрыть кнопку выделенных вкладок
  updateSelectedButton();
}

function updateSelectedButton() {
  const btn = document.getElementById('copySelectedBtn');
  const countSpan = document.getElementById('selectedCount');

  if (selectedTabsCount > 1) {
    btn.style.display = 'flex';
    countSpan.textContent = `(${selectedTabsCount})`;
  } else {
    btn.style.display = 'none';
  }
}

function updateTabCount() {
  const totalTabs = tabsData.groups.reduce((sum, g) => sum + g.tabs.length, 0) + tabsData.ungrouped.length;
  const groupCount = tabsData.groups.length;

  let countText = `${totalTabs} ${pluralize(totalTabs, t('tab_one'), t('tab_few'), t('tab_many'))}`;
  if (groupCount > 0) {
    countText += ` · ${groupCount} ${pluralize(groupCount, t('group_one'), t('group_few'), t('group_many'))}`;
  }

  document.getElementById('tabCount').textContent = countText;
}

function pluralize(n, one, few, many) {
  if (currentLang === 'en') {
    return n === 1 ? one : many;
  }

  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function formatAsList() {
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
      output += `${t('noGroup')}\n`;
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

function formatAsCSV() {
  let output = '';
  const d = csvDelimiter;

  if (useGrouping) {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const groupName = escapeCSV(group.groupName);
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${groupName}${d}${title}${d}${url}\n`;
        } else {
          output += `${groupName}${d}${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url);
      const noGroupText = escapeCSV(t('noGroup'));
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `${noGroupText}${d}${title}${d}${url}\n`;
      } else {
        output += `${noGroupText}${d}${url}\n`;
      }
    }
  } else {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${title}${d}${url}\n`;
        } else {
          output += `${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url);
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `${title}${d}${url}\n`;
      } else {
        output += `${url}\n`;
      }
    }
  }

  return output;
}

function escapeCSV(text) {
  if (text.includes(csvDelimiter) || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function displayData() {
  const outputDiv = document.getElementById('output');
  let content = '';

  if (currentFormat === 'list') {
    content = formatAsList();
  } else {
    content = formatAsCSV();
  }

  outputDiv.textContent = content;
}

function updateActiveButton() {
  document.getElementById('listBtn').classList.toggle('active', currentFormat === 'list');
  document.getElementById('csvBtn').classList.toggle('active', currentFormat === 'csv');
}

function updateCsvOptionsVisibility() {
  const csvOptions = document.querySelectorAll('.csv-option');
  csvOptions.forEach(el => {
    el.classList.toggle('visible', currentFormat === 'csv');
  });
}

function copyToClipboard() {
  const outputDiv = document.getElementById('output');
  const text = outputDiv.textContent;

  navigator.clipboard.writeText(text).then(() => {
    showNotification();
  });
}

function copySelectedToClipboard() {
  let text;
  if (currentFormat === 'list') {
    text = formatAsListFrom(selectedTabsData);
  } else {
    text = formatAsCSVFrom(selectedTabsData);
  }

  navigator.clipboard.writeText(text).then(() => {
    showNotification();
  });
}

function formatAsListFrom(data) {
  let output = '';

  if (useGrouping) {
    for (const group of data.groups) {
      for (const tab of group.tabs) {
        output += `${group.groupName}\n`;
        if (showTitle) {
          output += `${tab.title}\n`;
        }
        output += `${tab.url}\n`;
        output += `\n`;
      }
    }

    for (const tab of data.ungrouped) {
      output += `${t('noGroup')}\n`;
      if (showTitle) {
        output += `${tab.title}\n`;
      }
      output += `${tab.url}\n`;
      output += `\n`;
    }
  } else {
    for (const group of data.groups) {
      for (const tab of group.tabs) {
        if (showTitle) {
          output += `${tab.title}\n`;
        }
        output += `${tab.url}\n`;
        output += `\n`;
      }
    }

    for (const tab of data.ungrouped) {
      if (showTitle) {
        output += `${tab.title}\n`;
      }
      output += `${tab.url}\n`;
      output += `\n`;
    }
  }

  return output;
}

function formatAsCSVFrom(data) {
  let output = '';
  const d = csvDelimiter;

  if (useGrouping) {
    for (const group of data.groups) {
      for (const tab of group.tabs) {
        const groupName = escapeCSV(group.groupName);
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${groupName}${d}${title}${d}${url}\n`;
        } else {
          output += `${groupName}${d}${url}\n`;
        }
      }
    }

    for (const tab of data.ungrouped) {
      const url = escapeCSV(tab.url);
      const noGroupText = escapeCSV(t('noGroup'));
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `${noGroupText}${d}${title}${d}${url}\n`;
      } else {
        output += `${noGroupText}${d}${url}\n`;
      }
    }
  } else {
    for (const group of data.groups) {
      for (const tab of group.tabs) {
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${title}${d}${url}\n`;
        } else {
          output += `${url}\n`;
        }
      }
    }

    for (const tab of data.ungrouped) {
      const url = escapeCSV(tab.url);
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `${title}${d}${url}\n`;
      } else {
        output += `${url}\n`;
      }
    }
  }

  return output;
}

function showNotification() {
  const notification = document.getElementById('notification');
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2500);
}

async function loadShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const copyCommand = commands.find(cmd => cmd.name === 'copy-selected-tabs');
    const shortcutKeyEl = document.getElementById('shortcutKey');

    if (copyCommand && copyCommand.shortcut) {
      // Форматирование для лучшей читаемости
      let shortcut = copyCommand.shortcut;
      // Определить Mac через userAgentData или fallback
      const isMac = navigator.userAgentData?.platform === 'macOS' ||
                    navigator.userAgent.includes('Mac');
      // Заменить + на пробелы с символами для Mac
      if (isMac) {
        shortcut = shortcut
          .replace(/Alt\+/g, '⌥ ')
          .replace(/Shift\+/g, '⇧ ')
          .replace(/Ctrl\+/g, '⌃ ')
          .replace(/Command\+/g, '⌘ ')
          .replace(/MacCtrl\+/g, '⌃ ');
      }
      shortcutKeyEl.textContent = shortcut;
    } else {
      shortcutKeyEl.textContent = t('notSet');
    }
  } catch (e) {
    console.error('Failed to load shortcut:', e);
    document.getElementById('shortcutKey').textContent = '-';
  }
}
