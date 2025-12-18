let currentFormat = 'list';
let useGrouping = true;
let showTitle = true;
let csvDelimiter = ',';
let tabsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadTabs();
  updateTabCount();
  displayData();

  document.getElementById('listBtn').addEventListener('click', () => {
    currentFormat = 'list';
    updateActiveButton();
    updateCsvOptionsVisibility();
    displayData();
  });

  document.getElementById('csvBtn').addEventListener('click', () => {
    currentFormat = 'csv';
    updateActiveButton();
    updateCsvOptionsVisibility();
    displayData();
  });

  document.querySelectorAll('.delimiter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.delimiter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      csvDelimiter = btn.dataset.delimiter;
      displayData();
    });
  });

  document.getElementById('groupCheckbox').addEventListener('change', (e) => {
    useGrouping = e.target.checked;
    displayData();
  });

  document.getElementById('titleCheckbox').addEventListener('change', (e) => {
    showTitle = e.target.checked;
    displayData();
  });

  document.getElementById('copyBtn').addEventListener('click', () => {
    copyToClipboard();
  });
});

async function loadTabs() {
  const currentWindow = await chrome.windows.getCurrent({ populate: true });
  const tabs = currentWindow.tabs;

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

  for (const groupId in groups) {
    try {
      const group = await chrome.tabGroups.get(parseInt(groupId));
      groups[groupId].groupName = group.title || 'Без названия';
    } catch (e) {
      groups[groupId].groupName = 'Без названия';
    }
  }

  tabsData = {
    groups: Object.values(groups),
    ungrouped: ungroupedTabs
  };
}

function updateTabCount() {
  const totalTabs = tabsData.groups.reduce((sum, g) => sum + g.tabs.length, 0) + tabsData.ungrouped.length;
  const groupCount = tabsData.groups.length;

  let countText = `${totalTabs} ${pluralize(totalTabs, 'вкладка', 'вкладки', 'вкладок')}`;
  if (groupCount > 0) {
    countText += ` · ${groupCount} ${pluralize(groupCount, 'группа', 'группы', 'групп')}`;
  }

  document.getElementById('tabCount').textContent = countText;
}

function pluralize(n, one, few, many) {
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
      output += `No Group\n`;
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
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `No Group${d}${title}${d}${url}\n`;
      } else {
        output += `No Group${d}${url}\n`;
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

function showNotification() {
  const notification = document.getElementById('notification');
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2500);
}
