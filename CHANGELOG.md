# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-05-24

### Added
- Enhanced content verification with previous page context
- Improved capitalization and formatting preservation in OCR text correction
- Better handling of proper nouns, acronyms, and technical terms

### Fixed
- Fixed issue with empty pages showing "There is no text to correct" message
- Improved handling of image-only and empty pages in content verification
- Added automatic detection and filtering of metadata-only content
- Fixed issue with markdown image references (like `![img-0.jpeg](img-0.jpeg)`) appearing in output
- Fixed issue with duplicate pages in the final PDF

## [1.2.0] - 2025-05-17

### Added
- Page content type detection using Together.ai's Llama-Vision-Free model
- New `--detect-content` option to enable content type detection
- Support for preserving original image-only pages with `--preserve-images`
- Support for skipping empty pages with `--skip-empty`
- Intelligent handling of different page types (text, image, empty)
- Real-world test script for page content detection

## [1.1.0] - 2025-05-10

### Added
- Automatic page split detection using Together.ai's Llama-Vision-Free model
- New `--detect-splits` option to enable page split detection
- Support for processing book scans with two pages side by side
- Intelligent margin detection for optimal page splitting
- Real-world test script for page split detection

## [1.0.0] - 2025-05-03

### Added
- Initial release of PDF-OCR CLI
- OCR processing of PDF files using Mistral API
- Content verification using Together.ai free LLM
- CLI interface with various configuration options
- Support for processing multi-page PDFs
- Configurable sleep time between processing pages
- Retry mechanism for handling API errors
- Verbose logging option for debugging
