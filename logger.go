package main

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// InitLogger initializes the global logger to write to a file in the log directory
func InitLogger() (*os.File, error) {
	// Get the executable directory
	exePath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("failed to get executable path: %w", err)
	}
	exeDir := filepath.Dir(exePath)

	// Create log directory if it doesn't exist
	logDir := filepath.Join(exeDir, "log")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	// Create log file name with date
	currentDate := time.Now().Format("2006-01-02")
	logFileName := fmt.Sprintf("app_%s.log", currentDate)
	logFilePath := filepath.Join(logDir, logFileName)

	// Open log file for appending
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}

	// Write a startup message directly to file to ensure it's writable
	if _, err := logFile.WriteString(fmt.Sprintf("Log session started at %s\n", time.Now().Format(time.RFC3339))); err != nil {
		fmt.Printf("Warning: Failed to write startup message to log file: %v\n", err)
	}

	// Create a multi-writer to write to both stdout and file
	// Put logFile FIRST to ensure it gets written even if stdout fails
	multiWriter := io.MultiWriter(logFile, os.Stdout)

	// Set up slog handler
	handler := slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Customize time format if needed
			if a.Key == slog.TimeKey {
				a.Value = slog.StringValue(a.Value.Time().Format("2006-01-02 15:04:05"))
			}
			return a
		},
	})

	// Set global logger
	logger := slog.New(handler)
	slog.SetDefault(logger)

	slog.Info("Logger initialized", "path", logFilePath)

	return logFile, nil
}
