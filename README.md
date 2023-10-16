# ![icon](assets/icon-24.png) SWT - Stop Wasting Time

A Firefox browser extension to set how much time per day you can spend on a specific website or websites.

## Install

This extension is designed for Mozilla Firefox and uses Manifest V3. It is not published in the Mozilla Add-ons Library, but you can download and install it from [here](https://github.com/roboticp4nda/swt-StopWastingTime/releases).

**Step 1:** Download the latest version .xpi here: [Latest Release](https://github.com/roboticp4nda/swt-StopWastingTime/releases)  
**Step 2:** Go to `about:addons` in Firefox  
**Step 3:** Select the `Extensions` tab on the left  
**Step 4:** Click the gear icon at the top, then select `Install Add-on From File...`  
**Step 5:** Find and open the downloaded .xpi file  
**Step 6:** Done!  

## Use

Click the SWT icon that appears in the navigation bar next to the URL, or find it in the Extensions toolbar. You'll be able to add your own rules by adding a string, or strings (comma-separated) to look for in the URL. If the extension finds a match, it will start a timer based on what you've allocated for that specific rule.

You can also add exceptions for the same rule, which might be useful if you want to block most of the website, but not all of it. For example, you might set up a block match for `google.com`, but specify an exception for `mail.google.com`, which will allow you to freely view your emails without counting down, but will continue the timer on any other part or subdomain of Google.

Timers reset at midnight (active tabs will only reset timer after a refresh or upon next visit), but are otherwise saved between sessions, using your browser's local storage.

## Permissions

The first time you open the extension, you'll be prompted to give the extension the permission to "Access your data for all websites". This is necessary as the extension will add its own HTML, CSS, and JavaScript into any website that you specify in the rules, in order to display a timer or to create a blocking overlay if your allocated time runs out.

The extension does not read or store any of your personal data.
