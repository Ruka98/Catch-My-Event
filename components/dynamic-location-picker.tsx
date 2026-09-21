"use client"

import type { ComponentProps } from "react"
import dynamic from "next/dynamic"

// Dynamically import the LocationPicker component with SSR disabled
const DynamicLocationPicker = dynamic(() => import("./location-picker").then((mod) => mod.LocationPicker), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-md bg-gray-200" />,
})

export default DynamicLocationPicker