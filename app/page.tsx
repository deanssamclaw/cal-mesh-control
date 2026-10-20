import { getChanges, getDays, getMesh, MESH_PAGE, REPO_URL, type Health, type Transmission } from "@/lib/data";
import { central, centralDate, duration } from "@/lib/time";
import { Age } from "./age";
import { Daily } from "./daily";

// Regenerated at most once a minute, in the background. If rflab cannot be reached the
// regeneration throws and the last good page keeps being served; the ages say how old it is.
export const revalidate = 60;

const SOURCE: Record<Transmission["source"], string> = {
  responder: "Reply",
  presence: "Presence",
  noaa: "NOAA relay",
  other: "Other",
};

export default async function Page() {
  const [mesh, days, changes] = await Promise.all([getMesh(), getDays(), getChanges()]);
  const generated = new Date().toISOString();

  return (
    <main>
      <header>
        <h1>Cal on the mesh</h1>
        <p className="muted">
          What Cal&rsquo;s Meshtastic radio in Olathe has been doing. Times are Central. Page built{" "}
          <Age iso={generated} staleAfterMin={15} />.{" "}
          <a href={MESH_PAGE}>Live instrument</a> · <a href={REPO_URL}>Source</a>
        </p>
      </header>

      <section className="card health">
        <h2>
          Health {mesh && <Age iso={mesh.health.asOf} staleAfterMin={10} />}
        </h2>
        {mesh ? <HealthGrid h={mesh.health} /> : <Unavailable what="rflab" />}
      </section>

      <section className="card">
        <h2>Messages, last 30 days</h2>
        {days && days.length > 0 ? <Daily days={days} /> : <Unavailable what="rflab" />}
      </section>

      <div className="two">
        <section className="card">
          <h2>On the air</h2>
          {mesh ? (
            <ol className="feed">
              {mesh.sent.map((t, i) => (
                <li key={`${t.ts}-${i}`}>
                  <span className={`tag ${t.source}`}>{SOURCE[t.source]}</span>
                  <time dateTime={t.ts}>{central(t.ts)}</time>
                  {!t.broadcast && <span className="tag">Direct</span>}
                  {t.privateChannel && <span className="tag">Private channel</span>}
                  <p>{t.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <Unavailable what="rflab" />
          )}
        </section>

        <section className="card">
          <h2>Changelog</h2>
          {changes ? (
            <ol className="feed">
              {changes.map((c) => (
                <li key={c.number}>
                  <a href={c.url} className="tag">
                    #{c.number}
                  </a>
                  <time dateTime={c.mergedAt}>{centralDate(c.mergedAt)}</time>
                  <p>{c.title}</p>
                </li>
              ))}
            </ol>
          ) : (
            <Unavailable what="GitHub" />
          )}
        </section>
      </div>

      <footer className="muted">
        Read-only. Data comes from the cal-mesh public API on rflab and the cal-mesh repository on GitHub; nothing
        here is published that the live instrument does not already publish.
      </footer>
    </main>
  );
}

function HealthGrid({ h }: { h: Health }) {
  const learnOk = h.learn.state === "FRESH";
  return (
    <dl className="grid4">
      <Stat
        label="Radio"
        ok={h.radio.connected}
        value={h.radio.connected ? `Connected (${h.radio.transport})` : "Disconnected"}
        note={h.radio.firmware ? `firmware ${h.radio.firmware}` : undefined}
      />
      <Stat label="Bridge" ok={h.bridge.state === "running"} value={h.bridge.state} note={`up ${duration(h.bridge.uptimeS)}`} />
      <Stat label="Responder" ok={h.responderOn} value={h.responderOn ? "On" : "Off (kill switch)"} />
      <Stat
        label="Learning loop"
        ok={learnOk}
        value={learnOk ? "Fresh" : h.learn.state.toLowerCase()}
        note={!learnOk ? (h.learn.reason ?? undefined) : h.learn.lastRun ? `last run ${central(h.learn.lastRun)}` : undefined}
      />
      <Stat label="Power" value={h.power.battery === null ? "—" : h.power.battery > 100 ? "USB power" : `${h.power.battery}% battery`} note={h.power.voltage ? `${h.power.voltage.toFixed(2)} V` : undefined} />
      <Stat
        label="Airtime, Cal's transmissions"
        value={h.airtime.airUtilTx === null ? "—" : `${h.airtime.airUtilTx.toFixed(2)}%`}
        note={h.airtime.chUtil === null ? undefined : `channel busy ${h.airtime.chUtil.toFixed(1)}%`}
      />
      {/* Line counts of cal-mesh's logs. The sent log is capped at its last 5,000 lines, so past
          that the count stops growing; say what it is rather than "all time". */}
      <Stat label="Messages sent" value={h.totals.sent.toLocaleString("en-US")} note="in the sent log (keeps 5,000)" />
      <Stat label="Messages heard" value={h.totals.heard.toLocaleString("en-US")} note="in the inbox log" />
    </dl>
  );
}

function Stat({ label, value, note, ok }: { label: string; value: string; note?: string; ok?: boolean }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        {ok !== undefined && (
          <span className={ok ? "status good" : "status critical"} aria-label={ok ? "OK" : "Problem"}>
            {ok ? "●" : "▲"}
          </span>
        )}
        {value}
      </dd>
      {note && <dd className="note">{note}</dd>}
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return <p className="muted">{what} could not be reached when this page was built. It retries within a minute.</p>;
}
