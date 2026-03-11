"use client";

import Image from "next/image";
import { ChangeEvent, useId, useState } from "react";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  MediaAsset,
  UploadAssetResponse
} from "@/lib/media/types";
import styles from "./MediaPicker.module.css";

type MediaPickerProps = {
  canvasId: string;
  baseNodeId: string;
  selectedAssets: MediaAsset[];
  onChange: (assets: MediaAsset[]) => void;
  disabled?: boolean;
  maxAssets?: number;
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "Could not complete the media request.";
  } catch {
    return "Could not complete the media request.";
  }
}

export function MediaPicker({
  canvasId,
  baseNodeId,
  selectedAssets,
  onChange,
  disabled = false,
  maxAssets = 4
}: MediaPickerProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputId = useId();
  const atLimit = selectedAssets.length >= maxAssets;

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (atLimit) {
      setMessage(`You can attach up to ${maxAssets} images.`);
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("canvasId", canvasId);
      formData.set("baseNodeId", baseNodeId);
      formData.set("file", file);

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as UploadAssetResponse;
      onChange([...selectedAssets, payload.asset].slice(0, maxAssets));
      setMessage("Image uploaded and attached to the draft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    if (!imagePrompt.trim()) {
      setMessage("Write a prompt before generating an image.");
      return;
    }

    if (atLimit) {
      setMessage(`You can attach up to ${maxAssets} images.`);
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const payload: GenerateImageRequest = {
        canvasId,
        baseNodeId,
        prompt: imagePrompt.trim()
      };

      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as GenerateImageResponse;
      onChange([...selectedAssets, result.asset].slice(0, maxAssets));
      setImagePrompt("");
      setMessage(
        result.source === "openai"
          ? "OpenAI image generated and attached to the draft."
          : "Mock AI image generated and attached to the draft."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate image.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleRemove(assetId: string) {
    onChange(selectedAssets.filter((asset) => asset.id !== assetId));
  }

  return (
    <section className={styles.root}>
      <div className={styles.controls}>
        <label className={styles.uploadButton} htmlFor={inputId}>
          {isUploading ? "Uploading..." : "Upload image"}
        </label>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={styles.hiddenInput}
          disabled={disabled || isUploading || isGenerating || atLimit}
          id={inputId}
          onChange={handleUploadChange}
          type="file"
        />
        <button
          className={styles.generateButton}
          disabled={disabled || isUploading || isGenerating || atLimit}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? "Generating..." : "AI image"}
        </button>
      </div>

      <textarea
        className={styles.promptInput}
        disabled={disabled || isUploading || isGenerating || atLimit}
        onChange={(event) => setImagePrompt(event.target.value)}
        placeholder="Describe the atmosphere, setting, or object you want to generate."
        value={imagePrompt}
      />

      <p className={styles.helperText}>
        Attach up to {maxAssets} draft images. Uploaded and generated images use the same draft asset flow.
      </p>

      {message ? <p className={styles.message}>{message}</p> : null}

      {selectedAssets.length > 0 ? (
        <div className={styles.assetGrid}>
          {selectedAssets.map((asset) => (
            <figure className={styles.assetCard} key={asset.id}>
              <Image
                alt={asset.prompt ?? "Draft attachment"}
                className={styles.assetImage}
                height={320}
                src={asset.url}
                unoptimized
                width={320}
              />
              <figcaption className={styles.assetMeta}>
                <span>{asset.type === "generated-image" ? "AI draft" : "Upload"}</span>
                <button className={styles.removeButton} onClick={() => handleRemove(asset.id)} type="button">
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}