export interface HostInfo {
    hostname: string;
    os: string;
    platform: string;
    platformFamily: string;
    platformVersion: string;
    kernelVersion: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemory: number;
}

export interface SystemUsage {
    timestamp: string;
    cpuPercent: number;
    memoryUsage: number;
    memoryTotal: number;
    memoryPercent: number;
    load1: number;
    load5: number;
    load15: number;
}

export interface SystemHistory {
    data: SystemUsage[];
}

