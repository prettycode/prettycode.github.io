/* exported PlanSchedule */

// Presentation only: rows are the same canonical records passed to PortfolioChart.
function PlanSchedule({
  simulation,
  showYearEndPercentiles,
  onShowYearEndPercentilesChange,
}) {
  const { yearData, summary, retirementDelay, currentAge } = simulation;
  const detailsRef = React.useRef(null);
  React.useEffect(() => {
    let wasOpen;
    const beforePrint = () => {
      wasOpen = detailsRef.current.open;
      detailsRef.current.open = true;
    };
    const afterPrint = () => {
      detailsRef.current.open = wasOpen;
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const calendarStartYear = new Date().getFullYear();
  const yearEndColumns = showYearEndPercentiles
    ? [
        ["p50", "Median"],
        ["p10", "10th"],
        ["p25", "25th"],
        ["p75", "75th"],
        ["p90", "90th"],
      ]
    : [["p50", "Median"]];
  return (
    <div className="plan-schedule-wrap">
      <details className="plan-schedule" ref={detailsRef}>
        <summary>Full Plan Schedule</summary>
        <div className="plan-schedule-body">
          <div className="plan-schedule-toolbar">
            <p id="plan-schedule-note">
              Annual amounts in nominal dollars. Balances include investments
              and remaining bucket cash. Portfolio draws match the chart's
              portfolio draw marks; spending includes payments from the cash
              bucket. A transfer into the bucket does not reduce total money
              available. Spending through year-end columns are medians of
              simulated outcomes unless labeled with another percentile, so they
              need not add up across columns. Growth / loss is the median of
              individual investment gains. Year and age identify the row's
              start; depletion is measured at year-end.
            </p>
            <div className="plan-schedule-actions">
              <button
                type="button"
                className="solve-btn"
                onClick={() => window.print()}
              >
                Print schedule
              </button>
              <label className="chart-calendar-toggle">
                <input
                  type="checkbox"
                  checked={showYearEndPercentiles}
                  onChange={(e) =>
                    onShowYearEndPercentilesChange(e.target.checked)
                  }
                />
                Show other year-end percentiles
              </label>
            </div>
          </div>
          <div
            className="plan-schedule-scroll"
            role="region"
            aria-label="Full plan schedule"
            tabIndex={0}
          >
            <table aria-describedby="plan-schedule-note">
              <caption>
                Full Plan Schedule · {yearData.length - 1} years
              </caption>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  {currentAge !== undefined && <th scope="col">Age</th>}
                  <th scope="col" className="plan-schedule-phase">
                    Plan year
                  </th>
                  <th scope="col">Portfolio Draw</th>
                  {[
                    ["Spending", null],
                    ["Year-end", "Cash Bucket Balance"],
                    ["Year-start Total Balance", "(Investments + Cash)"],
                    ["Portfolio", "Growth / Loss"],
                  ].map(([title, secondLine]) => (
                    <th scope="col" key={title}>
                      {title}
                      {(secondLine || showYearEndPercentiles) && (
                        <>
                          <br />
                          {secondLine}
                          {showYearEndPercentiles &&
                            (secondLine ? " · Median" : "Median")}
                        </>
                      )}
                    </th>
                  ))}
                  {yearEndColumns.map(([key, label]) => (
                    <th scope="col" key={key}>
                      Year-end Total Balance
                      <br />
                      (Investments + Cash)
                      {showYearEndPercentiles && ` · ${label}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearData.slice(1).map((d) => {
                  return (
                    <tr key={d.year}>
                      <th scope="row">{calendarStartYear + d.year - 1}</th>
                      {currentAge !== undefined && <td>{d.startAge}</td>}
                      <td className="plan-schedule-phase">
                        {d.year <= retirementDelay
                          ? `Before retirement ${d.year}`
                          : `Retirement ${d.year - retirementDelay}`}
                        {summary.medianDepletionYear === d.year && (
                          <span className="plan-schedule-depletion">
                            {currentAge === undefined
                              ? "Median depleted at year-end"
                              : `Median depleted at age ${d.endAge}`}
                          </span>
                        )}
                      </td>
                      <td>{fmtMoneyFull(d.actual)}</td>
                      <td>{fmtMoneyFull(d.spending)}</td>
                      <td>{fmtMoneyFull(d.cashBalance)}</td>
                      <td>{fmtMoneyFull(d.totalStartBalance.p50)}</td>
                      <td>{fmtMoneyFull(d.growth)}</td>
                      {yearEndColumns.map(([key]) => (
                        <td key={key}>
                          {fmtMoneyFull(d.totalEndBalance[key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
