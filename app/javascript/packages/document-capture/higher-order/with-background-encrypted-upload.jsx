import React, { useContext } from 'react';
import UploadContext from '../context/upload';

/**
 * Encrypt data.
 *
 * @param {CryptoKey} key Encryption key.
 * @param {BufferSource} iv Initialization vector.
 * @param {string|Blob} value Value to encrypt.
 *
 * @return {Promise<ArrayBuffer>} Encrypted data.
 */
export async function encrypt(key, iv, value) {
  const data =
    typeof value === 'string' ? new TextEncoder().encode(value) : await value.arrayBuffer();

  return window.crypto.subtle.encrypt(
    /** @type {AesGcmParams} */ ({
      name: 'AES-GCM',
      iv,
    }),
    key,
    data,
  );
}

const withBackgroundEncryptedUpload = (Component) => ({ onChange, ...props }) => {
  const { backgroundUploadURLs, backgroundUploadEncryptKey } = useContext(UploadContext);

  /**
   * @param {Record<string, string|Blob|null|undefined>} nextValues Next values.
   */
  function onChangeWithBackgroundEncryptedUpload(nextValues) {
    const nextValuesWithUpload = {};
    for (const [key, value] of Object.entries(nextValues)) {
      nextValuesWithUpload[key] = value;
      const url = backgroundUploadURLs[key];
      if (url && value) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        nextValuesWithUpload[`${key}_image_iv`] = window.btoa(String.fromCharCode(...iv));
        nextValuesWithUpload[`${key}_image_url`] = encrypt(
          /** @type {CryptoKey} */ (backgroundUploadEncryptKey),
          iv,
          value,
        )
          .then((encryptedValue) => window.fetch(url, { method: 'POST', body: encryptedValue }))
          .then(() => url);
      }
    }

    onChange(nextValuesWithUpload);
  }

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Component {...props} onChange={onChangeWithBackgroundEncryptedUpload} />;
};

export default withBackgroundEncryptedUpload;
