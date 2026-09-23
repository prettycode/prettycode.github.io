/* exported PlanSchedule */

// Presentation only: rows are the same canonical records passed to PortfolioChart.
function PlanSchedule({
  yearData,
  medianDepletion,
  retirementDelay,
  currentAge,
}) {
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
  return (
    <div className="plan-schedule-wrap">
      <details className="plan-schedule" ref={detailsRef}>
        <summary>Full Plan Schedule</summary>
        <div className="plan-schedule-body">
          <div className="plan-schedule-toolbar">
            <p id="plan-schedule-note">
              Annual amounts in nominal dollars, rounded to the nearest dollar.
              Balances are portfolio percentiles, not a single simulated
              outcome. Withdrawals match the chart’s median marks; a cash bucket
              appears as an initial lump sum followed by years with no portfolio
              draw. Monthly draws are shown as annual totals. Year and age
              identify the start of each row. Growth / loss is the year-end
              median balance minus the starting median balance plus withdrawals;
              it is derived from these balances, not the median of individual
              simulation gains.
            </p>
            <button
              type="button"
              className="solve-btn"
              onClick={() => window.print()}
            >
              Print schedule
            </button>
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
                  <th scope="col">Withdrawal</th>
                  <th scope="col">
                    Starting balance
                    <br />
                    Median
                  </th>
                  <th scope="col">
                    Growth / loss
                    <br />
                    Median balances
                  </th>
                  <th scope="col">
                    Year-end
                    <br />
                    Median
                  </th>
                  <th scope="col">
                    Year-end
                    <br />
                    10th
                  </th>
                  <th scope="col">
                    Year-end
                    <br />
                    25th
                  </th>
                  <th scope="col">
                    Year-end
                    <br />
                    75th
                  </th>
                  <th scope="col">
                    Year-end
                    <br />
                    90th
                  </th>
                </tr>
              </thead>
              <tbody>
                {yearData.slice(1).map((d) => {
                  const withdrawal =
                    medianDepletion && d.year > medianDepletion.year
                      ? 0
                      : d.actual;
                  const growth =
                    d.endBalance.p50 - d.startBalance.p50 + withdrawal;
                  return (
                    <tr key={d.year}>
                      <th scope="row">{calendarStartYear + d.year - 1}</th>
                      {currentAge !== undefined && (
                        <td>{currentAge + d.year - 1}</td>
                      )}
                      <td className="plan-schedule-phase">
                        {d.year <= retirementDelay
                          ? `Before retirement ${d.year}`
                          : `Retirement ${d.year - retirementDelay}`}
                        {medianDepletion?.year === d.year && (
                          <span className="plan-schedule-depletion">
                            Median depleted
                          </span>
                        )}
                      </td>
                      <td>{fmtMoneyFull(withdrawal)}</td>
                      <td>{fmtMoneyFull(d.startBalance.p50)}</td>
                      <td>{fmtMoneyFull(growth)}</td>
                      {["p50", "p10", "p25", "p75", "p90"].map((key) => (
                        <td key={key}>{fmtMoneyFull(d.endBalance[key])}</td>
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
