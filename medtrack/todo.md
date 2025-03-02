# To-do

* Pagination for history list.
* In history list entries, change logic for deviation text color
    * Default text color (not blue) but fainter (like it's disabled) when deviation <= 5%
    * Red when deviation > 5%
* Double-check the adherence calculations.
* If there's no history yet, don't even display the history section.
* Prohibit the selection of a future date in either new or edit dose modals.
* Add a M/W/F schedule (same time each day)?
* Date (e.g. Mar 1) needs to fit in somewhere into Next Dose card.
* Countdown time (i.e. "Due in..." "Overdue by...") should only be bold if it's within N%, then change color based on what it will be in the adherence chart and history
    - Match colors up for all three areas.

# Adherence Gamification

* "Collecting" green vs. red marks, i.e. show as a horizontally-stacked bar chart
* Green check marks next to label in historical entries?
* Remember: we don't really care about if early or if late--the deviation is what matters, and deviation is measured absolutely (N% off-target).
