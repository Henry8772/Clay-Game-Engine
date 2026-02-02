"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const states = useQuery(api.gameStates.get);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {states?.map(({ _id, state, rules }) => (
        <div key={_id}>
          <div>State: {JSON.stringify(state)}</div>
          <div>Rules: {rules}</div>
        </div>
      ))}
    </main>
  );
}