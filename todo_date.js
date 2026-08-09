chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const currentUrl = tab.url;
  const currentTitle = tab.title;

  const $ = (id) => document.getElementById(id);
  const postButton = $("post-todoist");
  const saveTokenButton = $("save-token");
  const statusDiv = $("status");
  const datePicker = $("due-date-picker");
  const tokenInput = $("todoist-token");
  const tokenStorageKey = "todoistToken";

  $("url").textContent = currentUrl;
  $("title").textContent = currentTitle;

  // yyyy-mm-dd（今日をデフォルト）
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  datePicker.value = toYMD(new Date());

  const loadStoredToken = () =>
    new Promise((resolve) => {
      chrome.storage.sync.get([tokenStorageKey], (items) => {
        resolve(items[tokenStorageKey] || "");
      });
    });

  const saveStoredToken = (token) =>
    new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [tokenStorageKey]: token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });

  // uuid（randomUUIDが無ければフォールバック）
  const uuid = () =>
    globalThis.crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const initializeToken = async () => {
    const storedToken = await loadStoredToken();
    tokenInput.value = storedToken;
  };

  initializeToken().catch((e) => {
    console.error(e);
    statusDiv.textContent = "Unable to load saved token.";
  });

  saveTokenButton.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      statusDiv.textContent = "Please enter a Todoist API token.";
      return;
    }

    try {
      await saveStoredToken(token);
      statusDiv.textContent = "Token saved locally.";
    } catch (e) {
      console.error(e);
      statusDiv.textContent = "Failed to save token.";
    }
  });

  postButton.addEventListener("click", async () => {
    const selectedDate = datePicker.value;
    if (!selectedDate) {
      statusDiv.textContent = "Please select a due date.";
      return;
    }

    const todoistToken = tokenInput.value.trim();
    if (!todoistToken) {
      statusDiv.textContent = "Please enter a Todoist API token.";
      return;
    }

    try {
      await saveStoredToken(todoistToken);
    } catch (e) {
      console.error(e);
      statusDiv.textContent = "Failed to save token.";
      return;
    }

    const apiUrl = "https://api.todoist.com/api/v1/sync";

    const commandUuid = uuid();
    const tempId = uuid();

    // ★ここがポイント：due_date / due_string ではなく due オブジェクト
    const commands = [
      {
        type: "item_add",
        uuid: commandUuid,
        temp_id: tempId,
        args: {
          content: currentTitle,
          description: currentUrl,
          priority: 2,
          due: { date: selectedDate }, // ← "YYYY-MM-DD"
        },
      },
    ];

    postButton.disabled = true;
    statusDiv.textContent = "Posting...";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${todoistToken}`,
        },
        body: JSON.stringify({ sync_token: "*", commands }),
      });

      const text = await res.text();
      const body = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

      const st = body?.sync_status?.[commandUuid];
      if (st && st !== "ok") {
        throw new Error(`Todoist sync_status: ${JSON.stringify(st)}`);
      }

      const createdTaskId = body?.temp_id_mapping?.[tempId];
      console.log("Created task id:", createdTaskId);

      statusDiv.textContent = "Task created successfully!";
      setTimeout(() => window.close(), 1500);
    } catch (e) {
      console.error(e);
      statusDiv.textContent = String(e.message || e);
      postButton.disabled = false;
    }
  });
});