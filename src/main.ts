// SPDX-License-Identifier: Apache-2.0
// Starting page. It only lists the sample lands, to show the project runs.

import type { SampleIndexEntry } from "./land.ts";

async function start(): Promise<void> {
  const list = document.querySelector<HTMLUListElement>("#samples");
  if (!list) return;
  const response = await fetch("samples/index.json");
  const samples = (await response.json()) as SampleIndexEntry[];
  for (const sample of samples) {
    const item = document.createElement("li");
    item.textContent = `${sample.name}: ${sample.acres} acres (${sample.file})`;
    list.append(item);
  }
}

void start();
