"""Render the solver's JSON witnesses to scale, without manual pallet placement."""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle


def plan(ax, result, analysis, label, reserve):
    box = result["container"]
    length, width = (box[k] / 1000 for k in ("innerLength", "innerWidth"))
    ax.set_xlim(-0.05, length + .05)
    ax.set_ylim(-.06, width + .24)
    ax.set_aspect("equal")
    ax.set_yticks([0, width])
    ax.set_xlabel("Distanza dalla testata (m)")
    ax.set_title(f"{label}  |  {result['placedCount']} pallet  |  "
                 f"span {analysis['spanMm']/1000:.3f} m  |  coda {analysis['rearMm']/1000:.3f} m",
                 loc="left", fontsize=9)
    for i, zone in enumerate(analysis["zones"]):
        left, right = (zone[k] / 1000 for k in ("fromMm", "toMm"))
        ax.axvspan(left, right, color="#ecf2f8" if i % 2 == 0 else "#f8fafc", zorder=0)
        ax.axvline(left, color="#64748b", linewidth=.7, linestyle="--", zorder=3)
        ax.text((left + right) / 2, width + .05, f"Z{i+1} · {zone['palletEquivalents']:.2f}",
                fontsize=7, ha="center", va="bottom")
    if reserve:
        ax.add_patch(Rectangle((length - reserve/1000, 0), reserve/1000, width,
                               facecolor="none", edgecolor="#a16207", hatch="//", linewidth=0))
    colors = ["#72b5e8", "#71cf9e", "#b9a2e0", "#fec887"]
    stacks = {stack["rect"]["id"]: stack for stack in result.get("stacks", [])}
    for pallet in result["layout"]["rects"]:
        x, y, dx, dy = (pallet[k]/1000 for k in ("x", "y", "length", "width"))
        ax.add_patch(Rectangle((x, y), dx, dy, facecolor=colors[pallet.get("typeIndex", 0) % len(colors)],
                               edgecolor="#183653", linewidth=.65))
        stack = stacks.get(pallet.get("id"))
        layers = len(stack["layers"]) if stack else pallet.get("stackCount", 1)
        identity = pallet.get("id", str(pallet.get("layoutIndex", 0) + 1))
        ax.text(x + dx / 2, y + dy / 2, f"{identity}" + (f" ×{layers}" if layers > 1 else ""),
                ha="center", va="center", fontsize=6, color="#142c43", clip_on=True)
    ax.add_patch(Rectangle((0, 0), length, width, fill=False, edgecolor="#334155", linewidth=.9))
    for side in ax.spines.values():
        side.set_visible(False)


def render(cases, path):
    fig, grid = plt.subplots(len(cases), 2, figsize=(15, 2.05 * len(cases)), squeeze=False)
    for (left, right), case in zip(grid, cases):
        plan(left, case["original"], case["baseline"], case["name"] + " · Compatta", case["rearReserveMm"])
        if case["status"] == "distributed":
            plan(right, case["witness"], case["analysis"], "Distribuita", case["rearReserveMm"])
        else:
            right.set_axis_off()
            right.text(.5, .5, "Nessuna alternativa\nRiserva posteriore incompatibile con le file provate",
                       ha="center", va="center")
    fig.tight_layout(pad=1.5)
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json_path", type=Path)
    args = parser.parse_args()
    data = json.loads(args.json_path.read_text(encoding="utf-8"))
    render(data[:3], args.json_path.with_name("layout-europallet.png"))
    render(data[3:], args.json_path.with_name("layout-misto-advanced-riserva.png"))
