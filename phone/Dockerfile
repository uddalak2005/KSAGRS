FROM python:3.11-slim

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with UID 1000 for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user

# Configure environment variables to use the user's home directory for caching
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    TORCH_HOME=/home/user/.cache/torch

WORKDIR $HOME/app

# Copy requirements.txt first and install python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files and ensure they are owned by the non-root user
COPY --chown=user . $HOME/app

# Explicitly transfer ownership of the entire app directory tree to user 1000.
# This is critical: WORKDIR creates /home/user/app as root, so even though
# COPY --chown=user sets file ownership correctly, the parent directory itself
# is root-owned. ChromaDB's Rust bindings need write access to create
# chroma_langchain_db/ subdirectory, which fails without this chown.
RUN chown -R user:user $HOME

# Switch to the non-root user
USER user

# Run ingestion and download/cache all required models and datasets during the build phase.
# This downloads the Hugging Face datasets, sentence-transformers, and Silero VAD weights
# into the user's cache, and creates the Chroma vector database under correct user ownership.
RUN python -m rag.ingest

# Expose port 7860 (Hugging Face Spaces requirement)
EXPOSE 7860

# Launch the startup script which starts both the API server (on port 7860) and the LiveKit Voice Agent worker.
CMD ["./start.sh"]