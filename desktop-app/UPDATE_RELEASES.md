# Application updates from GitHub Releases

The installed Windows application checks the latest stable GitHub Release in `SamChico2008/Discord-Orbs-Studio` at startup and every 15 minutes while running. When a newer application version is available, it asks the user to choose **Update Now** or **Later**. Later postpones that version until the next launch; a newer release can still be offered during the session. The updater downloads nothing until the user accepts.

The title bar reads the installed version using Electron's `app.getVersion()`. It displays the full version, such as `v3.3.8`, and changes after the updated application restarts. The GitHub tag alone never changes the displayed installed version.

## Publish a release

Before publishing each Windows release:

1. Increase `desktop-app/package.json` and both application version fields in `desktop-app/package-lock.json`, for example to `3.3.11`. Add a matching `## 3.3.11` section to `desktop-app/CHANGELOG.md` summarizing the changes. Packaging checks that this section exists and is nonempty.
2. Build the setup with `npm --prefix desktop-app run build`.
3. Create a stable GitHub Release tagged `v3.3.11`, matching the version inside the installer. Upload `dist/Discord.Orb.Studio.Setup.3.3.11.exe`. Copy that version's changelog summary into the Release description. Publish after the upload finishes. Drafts and prereleases are ignored; commits and tags without a published Release do not trigger updates.
4. For compatibility with older runtime-based updaters, copy the marker printed by `npm --prefix desktop-app run runtime-release-marker` into the release description. The new application updater does not require this marker.

The repository and release assets must be publicly readable. While the repository is private, GitHub returns HTTP 404 to the installed app. It opens the current version and retries later. No personal GitHub token is embedded in the application. Making the repository public and publishing a stable Release enables the feed without another configuration change.

The updater verifies the GitHub asset SHA-256 digest and size, waits for the running app to exit, installs the complete setup and relaunches the app. Electron and its embedded Node.js arrive with the installer; the updater never queries npm or nodejs.org. A release without a usable checksummed setup is treated as awaiting an installer. Older unversioned `Discord Orb Studio Setup.exe` and GitHub-normalized names remain supported.

On Windows, a short bootstrap starts an independent installer helper through the Windows shell. The app waits for that helper's readiness marker before closing. If readiness fails, the current app stays open and the staged handoff is cancelled. The helper writes an installation/relaunch log beside the temporary setup file and explicitly reopens the app with a normal window after setup.

This flow targets the installed NSIS edition. Development runs skip application installation. Users of earlier previews should install the official 3.3.10 edition once to receive the current updater and post-update summaries. The previous runtime-based updater can still receive releases containing its compatible runtime metadata.

## Post-update summary

After an upgrade, the main interface shows a **What's new** dialog with the installed version and its release summary. It appears once per version after the user dismisses it. The beta notice does not appear over it during the same launch. A fresh installation records its version without reporting an upgrade.

The updater stores the selected Release description before running the installer, so the summary remains available offline. Internal HTML metadata comments are removed and remote text is rendered as text, headings and lists, never as executable HTML. The bundled changelog supplies the summary for manual upgrades and for migration from older updaters that restart with `--updated`. When neither cached nor bundled notes exist, a lookup targets the installed version's tag, never the latest version's notes. An unsuccessful installation does not show a success summary for a version that was not installed.

Version history and dismissal state are stored in `release-notes-state.json` in Electron's userData folder. Unread notes survive a restart; another later version gets its own summary.

## Verify

Run `npm --prefix desktop-app run test:updates` for release selection, confirmation, installation handoff, network failures, periodic checks and the title bar version bridge.
