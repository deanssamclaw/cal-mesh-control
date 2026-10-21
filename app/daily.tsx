import type { Day } from "@/lib/data";
import { centralDate } from "@/lib/time";

// 30 days of what Cal heard addressed to the mesh, split by what he did about it. Stacked
// columns, answered on the baseline (it is the number that matters), one y axis, a CSS-only
// tooltip per column (hover or keyboard focus), and the same numbers as a table below.
export function Daily({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.answered + d.notAnswered));
  const top = niceCeil(max);
  const answered = days.reduce((n, d) => n + d.answered, 0);
  const heard = days.reduce((n, d) => n + d.answered + d.notAnswered, 0);
  const mid = Math.floor(days.length / 2);

  return (
    <figure className="daily">
      <figcaption>
        <span className="legend">
          <i className="swatch s1" aria-hidden /> Answered
        </span>
        <span className="legend">
          <i className="swatch s2" aria-hidden /> Heard, not answered
        </span>
        <span className="muted">
          {answered} of {heard} over {days.length} days
        </span>
      </figcaption>

      <div className="plot" role="img" aria-label={`Daily messages over ${days.length} days; see the table below`}>
        <span className="ytick" style={{ bottom: "100%" }}>{top}</span>
        <span className="ytick" style={{ bottom: "0%" }}>0</span>
        <div className="grid" aria-hidden />
        {days.map((d) => {
          const total = d.answered + d.notAnswered;
          return (
            <div className="col" key={d.date} tabIndex={0}>
              <div className="stack" style={{ height: `${(total / top) * 100}%` }}>
                {d.notAnswered > 0 && <div className="seg s2" style={{ flexGrow: d.notAnswered }} />}
                {d.answered > 0 && <div className="seg s1" style={{ flexGrow: d.answered }} />}
              </div>
              <div className="tip" role="tooltip">
                <b>{centralDate(d.date)}</b>
                <span>
                  <i className="swatch s1" aria-hidden /> Answered {d.answered}
                </span>
                <span>
                  <i className="swatch s2" aria-hidden /> Not answered {d.notAnswered}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="xaxis" aria-hidden>
        <span>{centralDate(days[0].date)}</span>
        <span>{centralDate(days[mid].date)}</span>
        <span>{centralDate(days[days.length - 1].date)}</span>
      </div>

      <details>
        <summary>Table</summary>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Answered</th>
              <th>Not answered</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.date}>
                <td>{centralDate(d.date)}</td>
                <td>{d.answered}</td>
                <td>{d.notAnswered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceCeil(n: number): number {
  const step = n <= 10 ? 2 : n <= 50 ? 5 : 10;
  return Math.ceil(n / step) * step;
}
