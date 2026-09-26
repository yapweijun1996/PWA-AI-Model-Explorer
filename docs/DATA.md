# Dataset contract / 数据说明

## Provenance

The included snapshot retains exactly the 102 Intelligence + Cost rows in the
supplied V5 dashboard. 96 have all four metrics, and two display $0.00. Model
variants such as '(high)', '(max)' and '(Non-reasoning)' are separate rows.

The app does not verify that a named model exists today or that a value is
current. Model names and measurements are preserved as supplied. Publication /
benchmark as-of date was absent; `asOf` is null. `importedOn: 2026-09-26` is the
import date only. This is not a latest-ranking claim.

## Metrics

| Field | Source meaning | Direction / qualification |
|---|---|---|
| intelligence | Artificial Analysis Intelligence Index | Higher index, not IQ or a success percentage |
| cost | Cost per Task, USD | Lower displayed task cost; not price per million tokens |
| speed | Median Tokens/s | Higher output throughput |
| latency | Latency First Chunk (s) | Lower time to first chunk, not total response time |
| totalResponse | Total Response (s) | Supporting measurement; do not infer it from the other columns |
| context | Context Window text | Preserve source notation; not the guaranteed useful memory size |

Null means unavailable. Displayed $0.00 may be rounding; do not advertise free
usage from that number. Log-cost charts omit zero, with an explicit count.
Cost formatting preserves the supplied label, including $0.0045.

## Replace or update a snapshot

Edit `data/models.json`. Keep `schemaVersion: 1`, the dataset provenance object,
and a `models` array. Each model needs a unique stable ID, nonempty model and
creator labels, numeric intelligence and cost, a matching `costLabel`, and
nonnegative-or-null speed/latency/totalResponse. Retain existing IDs for the
same model variant so local notes keep their association. Use a new ID for a
meaningfully different variant. Unknown benchmark dates must remain null.

Then run:

```sh
npm run check
npm test
npm run build
```

The baseline count tests intentionally describe this supplied snapshot. For an
intentional authorized new dataset, update those baseline assertions along with
its provenance; do not weaken generic schema/filter tests.

The app contains no automatic upstream refresh. An authorized data refresh is a
new repository release, reviewed and distributed through the same explicit
update mechanism as code.

## Public release boundary

Code MIT licensing is separate from source data rights. Review the provider's
current redistribution terms before publishing this snapshot, or substitute
measurements you may publish. No permission from Artificial Analysis was
established by this task. Attribution alone does not establish permission.
