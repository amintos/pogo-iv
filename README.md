# Pokemon Go IV Odds

A standalone static website for exploring the odds of catching a Pokemon Go
Pokemon at, above, or below a selected IV percentage.

Open `index.html` in a browser to use it. There are no JavaScript dependencies
and no build step.

## Quick Tutorial

1. Choose an IV threshold on the chart.
   Click or drag inside the graph to select the nearest real Pokemon Go IV
   percentage. Use the small left/right arrows beside the percentage pill to
   step through exact IV sums.

2. Jump by appraisal stars.
   Click a star-rating band on the x-axis to jump to that band's lower bound:
   0 stars, 1 star, 2 stars, 3 stars, or 4 stars.

3. Choose what the chance means.
   Use the range selector below the chart to compute the chance of the selected
   percentage or higher, exactly that percentage, or that percentage or lower.
   The highlighted part of the graph follows this choice.

4. Compare IV floors.
   Toggle IV floors such as Weather boost, Raid, Shadow Raid, and Lucky to
   overlay their distributions and add their chance rows. Wild remains the
   baseline.

5. Include shiny odds when needed.
   Enable shiny odds to multiply the relevant rows by the selected shiny rate.
   Wild and Weather boost use the wild shiny slider. Raid and Shadow Raid use
   the raid shiny setting. Lucky is not affected by shiny odds.

6. Pin a chance as a reference.
   Click the pin icon on any chance row to freeze that value. Other live rows
   then show how many times more or less likely they are compared with the
   pinned reference. The chart also shows a dashed reference line.

7. Use cumulative attempts.
   After pinning a chance, the Attempts panel shows the probability of getting
   at least one success after a configurable number of attempts, and how many
   attempts are needed for a configurable target chance.
