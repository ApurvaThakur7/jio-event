import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(18);
Config.setPublicDir("remotion/public");

// This machine runs close to its memory commit limit. Chrome's video-frame decode
// cache is the single largest consumer during render, so it's capped hard here —
// default is a fraction of system RAM, which is exactly what was starving everything
// else and causing ERR_INSUFFICIENT_RESOURCES mid-render.
Config.setOffthreadVideoCacheSizeInBytes(150 * 1024 * 1024);
Config.setConcurrency(1);
