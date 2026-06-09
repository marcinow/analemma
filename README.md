* Plan with Opus model

```I would like to create a standalone web page to present an interactive drawing of analemma. Moving mouse or cursor over analemma should present a date related to the position and provide additional information day/night duration, sunset/sunrise time, phase of the Moon. To draw proper analemma for a given geo location I can select a city or provide lattitude an longitude. Help me to plan such web page. Suggest tech stack, discuss with me UX, etc. Help me to plan the app and create a prd file (Product Requirements Document) that will be used further to build / implement the app.```

``` Break the PRD into independently-grabbable issues using vertical slices (tracer bullets) and put them into ISSUES.md file. For each issue add a status to allow monitoring its progress. ```

* Keep context between sessions: add PRD.md and ISSUES.md files to CLAUDE.md file

* Implement with Sonnet model

``` implement Issue N ```
``` mark Issue N as Done, also add what was delivered and tests result to the issue description in ISSUES.md file ```
``` write down playwright tests for issue 7 to a separate file in test folder so it coule be run later to detect regressions ```
- commit after each issue is implemeted (makes easy to navigate between implemenation phases or to discard incorrect implementation)

* Restart Claude session to refresh context (when tokens > 40% ?)
With full context (52%) I was asked to verify new functionality (on web page) manually. With fresh context testing was done automatically with chromium/playwright and a display issue was found/fixed.
Of course we can ask explicitely to test with chromium/playwright.

* Install chromium and playwright so they could be used between sessions
``` Two commands are all you need:

  npm install -g playwright && playwright install chromium

  After that, import {chromium} from 'playwright' works in any Node script without a local install.

  One nvm caveat: the global install is tied to whichever Node version is active. If you nvm use a different version later, re-run both
  commands under it. To avoid surprises, make sure your default is pinned:

  nvm alias default 22 ```


  * Caevats of the method:
  - no tracking of regressions ... maybe tests should be gathered somehow?