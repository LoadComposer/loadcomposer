from pathlib import Path
import json
r=Path(__file__).resolve().parents[1];p=r/'work/site/index.html';s=p.read_text();old=s
# Exact representation of every operational single floor position; never apply to capacityLayout.
a='''          if (!layout.truncated && (
            materializedOrientations.normal !== counts.normal ||
            materializedOrientations.rotated !== counts.rotated
          )) {'''
b='''          if (
            materializedOrientations.normal !== counts.normal ||
            materializedOrientations.rotated !== counts.rotated
          ) {'''
assert s.count(a)==1;s=s.replace(a,b)
a='''        if (layout.truncated !== (layout.count > rects.length)) {''';b='''        // Operational loads contain at most 500 pallets and must be complete.
        // A partial load is allowed; omitting its declared floor positions is not.
        if (layout.truncated !== false) {''';assert s.count(a)==1;s=s.replace(a,b)
a='''        if (!layout.truncated && layout.count !== rects.length) {''';b='''        if (layout.count !== rects.length) {''';assert s.count(a)==1;s=s.replace(a,b)
a='''        const expectedPhysicalLayers = physicalLayersFor(''';b='''        // Unlike legacy theoretical capacity envelopes, the loaded envelope
        // describes every represented floor position, including an empty load.
        if (layout.usedLength !== maximumRectLength || layout.usedWidth !== maximumRectWidth) {
          errors.push(geometryIssue("INVALID_USED_SPAN", t("geometry.invalidUsedSpan")));
        }

        const expectedPhysicalLayers = physicalLayersFor(''';assert s.count(a)==1;s=s.replace(a,b)
a='''            (layout.count > 0 && (!Number.isSafeInteger(layout.sourceCapacityCount) ||''';b='''            ((layout.count > 0 || Object.hasOwn(layout, "sourceCapacityCount")) &&
              (!Number.isSafeInteger(layout.sourceCapacityCount) ||''';assert s.count(a)==1;s=s.replace(a,b)
a='''      // The common operational gate must also recheck single results, including
      // stale successful flags left by an invalidated or altered loaded plan.
      if (result.mode === "single") {''';b='''      // Recheck all ordinary operational plans, including floor-only mixed
      // results whose previous successful flags may no longer describe the load.
      // Advanced results retain their separate V-01 copy/stack contract below.
      if (result.mode === "single" || !(Object.hasOwn(result, "stacks") ||
          result.advancedValidation || (result.advancedStacking && result.stackedCount > 0))) {''';assert s.count(a)==1;s=s.replace(a,b)
a='''errors: [{ code: "INVALID_SINGLE_LAYOUT_STRUCTURE", message: t("geometry.invalidSingleStructure") }] }; }''';b='''errors: [{ code: result.mode === "single" ? "INVALID_SINGLE_LAYOUT_STRUCTURE" : "INVALID_RESULT_STRUCTURE",
            message: t(result.mode === "single" ? "geometry.invalidSingleStructure" : "geometry.invalidStructure") }] }; }''';assert s.count(a)==1;s=s.replace(a,b)
a='''      if (!(Object.hasOwn(result, "stacks") || result.advancedValidation ||
          (result.advancedStacking && result.stackedCount > 0))) return;
''';assert s.count(a)==1;s=s.replace(a,'')
p.write_text(s)
# QA wiring and delivery separation only.
p=r/'work/package.json';x=json.loads(p.read_text());x['scripts']['test:c3f']='node tests/c3f-operational-v1.5.0.mjs && node tests/c3f-operational-browser-v1.5.0.mjs';x['scripts']['test']+=' && npm run test:c3f';p.write_text(json.dumps(x,indent=2)+'\n')
p=r/'work/scripts/create-delivery-v1.5.0.py';s=p.read_text().replace('f"CAPACITY_VALIDATION_HOTFIX-C3d-v{VERSION}.md")','f"CAPACITY_VALIDATION_HOTFIX-C3d-v{VERSION}.md", f"OPERATIONAL_LAYOUT_HOTFIX-C3f-v{VERSION}.md")').replace('f"capacity-c3d-v{VERSION}")','f"capacity-c3d-v{VERSION}", f"operational-c3f-v{VERSION}")');p.write_text(s)
print('C3f patch applied; producer/solver/runtime/worker/Advanced/sweep/cache untouched')
