let currentFormat = 'list';
let useGrouping = true;
let showTitle = true;
let tabsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadTabs();
  displayData();

  document.getElementById('listBtn').addEventListener('click', () => {
    currentFormat = 'list';
    updateActiveButton();
    displayData();
  });

  document.getElementById('csvBtn').addEventListener('click', () => {
    currentFormat = 'csv';
    updateActiveButton();
    displayData();
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

  if (useGrouping) {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const groupName = escapeCSV(group.groupName);
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${groupName},${title},${url}\n`;
        } else {
          output += `${groupName},${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url);
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `No Group,${title},${url}\n`;
      } else {
        output += `No Group,${url}\n`;
      }
    }
  } else {
    for (const group of tabsData.groups) {
      for (const tab of group.tabs) {
        const url = escapeCSV(tab.url);
        if (showTitle) {
          const title = escapeCSV(tab.title);
          output += `${title},${url}\n`;
        } else {
          output += `${url}\n`;
        }
      }
    }

    for (const tab of tabsData.ungrouped) {
      const url = escapeCSV(tab.url);
      if (showTitle) {
        const title = escapeCSV(tab.title);
        output += `${title},${url}\n`;
      } else {
        output += `${url}\n`;
      }
    }
  }

  return output;
}

function escapeCSV(text) {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
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

function copyToClipboard() {
  const outputDiv = document.getElementById('output');
  const text = outputDiv.textContent;

  navigator.clipboard.writeText(text).then(() => {
    showNotification();
  });
}

function showNotification() {
  const notification = document.getElementById('notification');
  notification.classList.remove('hidden');
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 2000);
}
