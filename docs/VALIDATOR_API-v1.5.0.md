# v1.5.0 — Advanced validator internal API contract

`loadComposerAdvancedStackingValidator.validate(result)` is read-only and returns
`{valid, errors}`. It does not repair or normalize an output. The application
combines it with the general geometry validator and rechecks at table, preview
and operational print boundaries. An inconsistent output is a validation error.

The input is the UI-normalized mixed-load model: pallet length, width and height
are positive safe integers in millimetres; quantities and horizontal/vertical
gaps are nonnegative safe integers; Max layers is a positive safe integer.
Group references are zero-based integer array indices. Pallet unit references
are positive integers, with id `${typeIndex + 1}.${unitNo}`. Rotated is boolean;
rotation mode is `auto` or `locked`, locked orientation `normal` or `rotated`;
stackingEnabled is boolean, role `any`, `base` or `top`, allowedAbove an array
of valid group indices. The UI still performs its existing mm/cm/in conversion
and rounding. No conversion or unit semantics were changed by this hotfix.

Raw decimal pallet dimensions (including the direct 1.1 + 2.2 vs 3.3 probe),
string numbers and negative gaps are outside this normalized contract and are
explicitly rejected. Arbitrary raw API input to the solver is not a supported
UI ingestion path; the solver itself was not changed.

Container and known door dimensions must be positive finite numbers. Coordinates
may be fractional (for example, centering), but must be finite nonnegative
numbers. Copy equivalence is exact, without epsilon or type coercion. Physical
floor bounds/separation retain the general validator's 0.0001 mm tolerance;
stack height and oriented pallet dimensions retain their exact comparisons.
NaN and Infinity are not accepted in relevant numeric fields.

`layout.rects` is the canonical floor. Floor ids and positions are unique and
each floor has exactly one stack. Its rect and first layer agree on id,
typeIndex, unitNo, positionId, rotated, x/y, length/width, originalLength/Width
and pallet height. Optional floor-strategy metadata (layoutIndex and footprint
length/width) agrees in presence and value between these three floor copies.
The separate stack.height is the cumulative height, and layer.layer is the
one-based level: these legitimately differ from floor fields and are not part
of an arbitrary whole-object comparison. Names/labels are presentation data;
inventory identity is the group/unit/id tuple. Upper layers may have different
group, orientation, nominal dimensions and height when the oriented footprint,
roles, adjacency, access and cumulative height allow them. Their coordinates,
oriented footprint and position refer to the canonical floor.

Max layers comes from the canonical base group, never the stack rect copy or
an intermediate layer. Inventory, reconciliation, uniqueness and stack result
counts are checked. Both production validators remain necessary: the general
validator additionally checks layout spans, materialization and whole-result
counts/access. Operational integration renders the existing localized validation
error and fallback messages in all seven locales; machine error codes remain
available in advancedValidation for diagnostics.
