import asyncio
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.pipeline.runner import PipelineRunner
from pipecat.processors.frame_processor import FrameProcessor
from pipecat.frames.frames import TextFrame

class DummyTransportOutput(FrameProcessor):
    def __init__(self):
        super().__init__()
        self.started = False
    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        print(f"Transport output got frame: {frame}")

async def main():
    transport_output = DummyTransportOutput()
    
    # Task 1
    task1 = PipelineTask(Pipeline([transport_output]))
    runner1 = PipelineRunner()
    
    async def run1():
        await runner1.run(task1)
    
    t1 = asyncio.create_task(run1())
    await asyncio.sleep(1)
    await task1.queue_frame(TextFrame("Hello from task1"))
    await asyncio.sleep(1)
    await task1.cancel()
    await t1
    
    # Task 2
    task2 = PipelineTask(Pipeline([transport_output]))
    runner2 = PipelineRunner()
    async def run2():
        await runner2.run(task2)
    t2 = asyncio.create_task(run2())
    await asyncio.sleep(1)
    await task2.queue_frame(TextFrame("Hello from task2"))
    await asyncio.sleep(1)
    await task2.cancel()
    await t2

if __name__ == "__main__":
    asyncio.run(main())
