# Life on Your Terms

A portfolio spending simulator: given the money you have today and what you want to spend each year, it estimates how likely that money is to last through the age you plan for.

## Language

**Liquid Assets**:
The money you have available today to fund your life, entered as a single amount.
_Avoid_: Invested Portfolio Today, balance, starting balance

**Portfolio**:
All of your money at any point in the plan: the **Investments** plus the **Cash Bucket**. Today, it's your Liquid Assets.
_Avoid_: total balance

**Investments**:
The part of the Portfolio that's exposed to market returns: everything except the Cash Bucket.
_Avoid_: portfolio (for this narrower meaning), invested portfolio

## Timeline

**Starting Age**:
The age at which the Portfolio starts paying for your life. Spending begins in that year.
_Avoid_: retirement age, retire, retirement, "when withdrawals begin"

**Accumulation Period**:
The years between your Current Age and your Starting Age. The Portfolio grows or shrinks with the market, but nothing is spent from it and nothing is added to it. It lasts zero years when Starting Age equals Current Age.
_Avoid_: retirement delay, delay

**Plan Through Age**:
The birthday at which the plan ends. A Plan Through Age of 90 funds you until you turn 90, not through the year you are 90.
_Avoid_: horizon, depletion age, life expectancy

**Distribution Period**:
The years from Starting Age until Plan Through Age, during which the Portfolio pays for your life.
_Avoid_: retirement, drawdown phase, spending period

## Money out

**Distribution**:
Money that leaves the Portfolio to pay for your life. Moving money between the Investments and the Cash Bucket is not a Distribution.
_Avoid_: withdrawal, draw, portfolio draw, spending

**Annual Distribution**:
The yearly amount you choose to take from the Portfolio, stated in today's dollars.
_Avoid_: Annual Spending, withdrawal amount

**Planned Distribution**:
The amount the plan calls for in a given year of the Distribution Period. It's normally the Annual Distribution adjusted for inflation up to that year. The exception is Bucket Years with bucket inflation off, when it stays at the first year's amount. The actual Distribution falls short of it once the Portfolio is empty.
_Avoid_: intended withdrawal, required distribution

## Cash Bucket

**Cash Bucket**:
Cash set aside from the Investments at Starting Age to pay the first Bucket Years' Planned Distributions. It earns no return and is never refilled.
_Avoid_: lump sum, upfront withdrawal, multi-year bucket

**Bucket Years**:
The number of years of Planned Distributions the Cash Bucket is sized to cover. One Bucket Year means there's no Cash Bucket, and every Distribution comes straight from the Investments.
_Avoid_: upfront years, lump-sum years

**Bucket Funding**:
The one-time move of money from the Investments into the Cash Bucket at Starting Age. When the Investments can't cover it in full, the bucket holds only what was available and covers the earliest years first.
_Avoid_: portfolio draw, lump-sum withdrawal

## Outcomes

**Simulation**:
One randomly generated market history played out across the whole plan. The app runs many of them and reports what share of them had each outcome.
_Avoid_: run, path, trial, scenario

**Depletion**:
The point at which the whole Portfolio, Investments and Cash Bucket together, is empty in a Simulation. If the Investments are empty but the Cash Bucket still holds money, that isn't Depletion.
_Avoid_: running out, ruin, failure, portfolio depletion (for Investments alone)

**Success Rate**:
The share of Simulations that don't reach Depletion before Plan Through Age.
_Avoid_: odds, probability of success, safe withdrawal rate

**Target Success Rate**:
The Success Rate you want. The app solves for the Annual Distribution, Liquid Assets or Starting Age that reaches it.
_Avoid_: SWR target, confidence level

## Money and markets

**Today's Dollars**:
An amount adjusted for inflation to show what it would buy today.
_Avoid_: real dollars, inflation-adjusted dollars

**Future Dollars**:
An amount as it would actually be counted in a future year, with no inflation adjustment.
_Avoid_: nominal dollars

**Market Preset**:
A named set of return, volatility and inflation assumptions, chosen as a Region plus a Market Outlook.
_Avoid_: scenario

**Region**:
The market the preset's assumptions are drawn from: U.S. or World.

**Market Outlook**:
Whether the preset reflects typical historical conditions (Historical) or a deliberately pessimistic case (Stress Case).
_Avoid_: scenario, worst case
