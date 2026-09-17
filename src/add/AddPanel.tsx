import { useRef, useState } from 'react';
import { COPY } from '../copy';

/**
 * Add a book.
 *
 * A drop zone, and the three things that happen to a file before it can be
 * cited — because that sequence is the whole product promise, and a reader who
 * drops a PDF is owed it. There is no ingestion behind this yet, and the
 * interface says so rather than implying success.
 */

interface Queued {
	id: number;
	name: string;
	note: string;
}

let nextId = 0;

export function AddPanel() {
	const [over, setOver] = useState(false);
	const [queue, setQueue] = useState<Queued[]>([]);
	const picker = useRef<HTMLInputElement>(null);

	const accept = (files: Iterable<File>) => {
		const taken = [...files].map((file) => ({
			id: nextId++,
			name: file.name,
			note: /\.pdf$/i.test(file.name)
				? COPY.add.held
				: COPY.add.notPdf(file.name),
		}));
		if (taken.length) setQueue((current) => [...taken, ...current]);
	};

	return (
		<section className="grid min-h-0 grid-rows-[minmax(0,1fr)]">
			<div className="max-w-spread mx-auto w-full overflow-y-auto px-5 py-7 @max-fold:max-w-thread @max-compact:px-3.5 @max-compact:py-5">
				<div
					onDragEnter={(event) => {
						event.preventDefault();
						setOver(true);
					}}
					onDragOver={(event) => {
						event.preventDefault();
						setOver(true);
					}}
					onDragLeave={() => setOver(false)}
					onDrop={(event) => {
						event.preventDefault();
						setOver(false);
						accept(event.dataTransfer.files);
					}}
					className={`bg-paper-lift rounded-2xl border px-6 py-10 text-center transition-[border-color,transform] duration-300 ease-paper ${
						over
							? 'border-verdigris scale-[1.01]'
							: 'border-paper-deep'
					}`}
				>
					<p className="m-0 text-xl leading-snug font-light italic">
						{COPY.add.drop}
					</p>
					<p className="font-app text-ui text-ink-soft mt-2">
						{COPY.add.or}{' '}
						<button
							type="button"
							onClick={() => picker.current?.click()}
							className="font-app border-ink-faint hover:text-ink border-b"
						>
							{COPY.add.choose}
						</button>
					</p>
					<input
						ref={picker}
						type="file"
						accept="application/pdf"
						multiple
						hidden
						onChange={(event) => {
							if (event.target.files) accept(event.target.files);
							event.target.value = '';
						}}
					/>
				</div>

				<ol className="font-app text-ui text-ink-soft mt-6 list-none p-0">
					{COPY.add.steps.map((step, index) => (
						<li
							key={step.lead}
							className="border-paper-deep grid grid-cols-[1.3rem_1fr] gap-2 border-t py-2 leading-snug"
						>
							<span className="text-ink-faint">{index + 1}</span>
							<span>
								<b className="text-ink font-normal">
									{step.lead}
								</b>{' '}
								{step.rest}
							</span>
						</li>
					))}
				</ol>

				{queue.length > 0 && (
					<div className="font-app text-ui text-ink-soft mt-5">
						<h2 className="text-ink-faint text-small mb-1">
							{COPY.add.queueTitle}
						</h2>
						{queue.map((file) => (
							<div
								key={file.id}
								className="border-paper-deep animate-rise flex justify-between gap-4 border-t py-2"
							>
								<span className="text-ink truncate">
									{file.name}
								</span>
								<span className="shrink-0">{file.note}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
