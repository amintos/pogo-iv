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

2. Set individual IVs when needed.
   Open **Individual IVs** below the chart to choose Attack, Defense, and
   Stamina from 0 to 15. Changing a stat selects its exact IV percentage.
   Changing the percentage balances the stats one point at a time; open or
   close the controls without losing the selected values.

3. Jump by appraisal stars.
   Click a star-rating band on the x-axis to jump to that band's lower bound:
   0 stars, 1 star, 2 stars, 3 stars, or 4 stars.

4. Choose what the chance means.
   Use the range selector below the chart to compute the chance of the selected
   percentage or higher, exactly that percentage, or that percentage or lower.
   The highlighted part of the graph follows this choice.

5. Compare IV floors.
   Toggle IV floors such as Weather boost, Raid, Shadow Raid, and Mighty to
   overlay their distributions and add their chance rows. Open the Trade group
   to show Lucky plus the friendship trade floors. Wild remains the baseline.

6. Include shiny odds when needed.
   Enable shiny odds to multiply the relevant rows by the selected shiny rate.
   Wild, Weather boost, and Mighty use the encounter-rate slider. Raid and
   Shadow Raid use the raid shiny setting. Trade floors are not affected by
   shiny odds.

7. Pin a chance as a reference.
   Click the pin icon on any chance row to freeze that value. Other live rows
   then show how many times more or less likely they are compared with the
   pinned reference. The chart also shows a dashed reference line.

8. Use cumulative attempts.
   After pinning a chance, the Attempts panel shows the probability of getting
   at least one success after a configurable number of attempts, and how many
   attempts are needed for a configurable target chance.
