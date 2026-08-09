# Todo Date

A Chrome/Edge extension that posts the current tab title and URL to Todoist with a selected due date.
もともと、Todoist にはブラウザ用拡張機能があるが、それは多機能で簡単では無かった。ブラウザを見ていて、拡張機能のボタンを押して、日付を選んだらそのままクリックで動作するものを作ってみた。

## Setup

1. Load the extension in Chrome/Edge as an unpacked extension.
2. Open the popup and enter your Todoist API token.
3. Click "Save Token" and then "Post to Todoist".

## Notes

- The token is stored locally in the browser using `chrome.storage.sync`.
- Do not commit any real API token to GitHub.
