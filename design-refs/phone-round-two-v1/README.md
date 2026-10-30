# Phone round two v1: the design ref

Nick's picks (30 Oct):
- Round two (`round-two-options.html`): 1C the band's numbers are the filters · 2A activity at the bottom of Home · 3 superseded by 1D below · 4A Up next, then a checklist · 5 superseded by Smart querying.
- Smart querying (`smart-querying-options.html`): 1D navy everywhere, each tab its own hero · 2B Packages gets its own tab, To-do moves onto Home · 3A one Packages page with shelves · 4A showcase cards for What's landing · 5B the builder shows what an agent receives.

Files:
- `app.html`: the phone-app-v2 prototype with every option layered on. The options are opened through the hash, e.g. `app.html#opt=n2,c4,p3&tab=queries`.
- `src/boot2.js` (round two) and `src/boot3.js` (smart querying): the options as CSS and render overrides. The picked option keys are `p3`, `f1`, `c4`, `t1`, `n2`, land `A` and build `B`. Every other key is rejected.
- `shots/`: the picked screens at 390 × 844 (@2x). Some shots were taken without `n2`, so their tab bar still shows To-do. The tab bar is always Home · Queries · + · Packages · Agents.
- `today-pills.png`: Nick's dev screenshot of the clipped pills.

Sample names, numbers and copy are illustrative. Real figures come from the app's own derivations.
