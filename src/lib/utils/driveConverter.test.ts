import { describe, it, expect } from 'vitest';
import { convertDriveUrl, getDownloadUrl } from './driveConverter';

describe('driveConverter utils', () => {
  describe('convertDriveUrl', () => {
    it('converts Google Docs URLs to minimalist preview format', () => {
      const docUrl = 'https://docs.google.com/document/d/1a2b3c4d5e/edit?usp=sharing';
      expect(convertDriveUrl(docUrl)).toBe(
        'https://docs.google.com/document/d/1a2b3c4d5e/preview?rm=minimal'
      );
    });

    it('converts regular Google Drive file URLs (e.g. PDF) to file preview format', () => {
      const fileUrl = 'https://drive.google.com/file/d/9z8y7x6w5v/view?usp=drivesdk';
      expect(convertDriveUrl(fileUrl)).toBe(
        'https://drive.google.com/file/d/9z8y7x6w5v/preview'
      );
    });

    it('returns empty string if URL is empty', () => {
      expect(convertDriveUrl('')).toBe('');
    });

    it('returns original URL if no Drive file ID is detected', () => {
      const nonDriveUrl = 'https://example.com/myfile.pdf';
      expect(convertDriveUrl(nonDriveUrl)).toBe(nonDriveUrl);
    });
  });

  describe('getDownloadUrl', () => {
    it('generates direct PDF export download URL for Google Docs', () => {
      const docUrl = 'https://docs.google.com/document/d/1a2b3c4d5e/edit';
      expect(getDownloadUrl(docUrl)).toBe(
        'https://docs.google.com/document/d/1a2b3c4d5e/export?format=pdf'
      );
    });

    it('generates direct export download URL for general Drive files', () => {
      const fileUrl = 'https://drive.google.com/file/d/9z8y7x6w5v/view';
      expect(getDownloadUrl(fileUrl)).toBe(
        'https://drive.google.com/uc?export=download&id=9z8y7x6w5v'
      );
    });

    it('returns empty string if input is falsy', () => {
      expect(getDownloadUrl('')).toBe('');
    });
  });
});
