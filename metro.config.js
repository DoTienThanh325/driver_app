const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Giới hạn số lượng worker để tiết kiệm RAM trên máy 8GB, tránh lỗi OOM (Zone Allocation failed)
config.maxWorkers = 2;

module.exports = config;
