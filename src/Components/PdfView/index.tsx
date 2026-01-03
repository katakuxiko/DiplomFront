import { Spin } from "antd";
import { useEffect, useState, useRef, memo, useCallback, ComponentType } from "react";
import "react-pdf/dist/Page/TextLayer.css";
import { useAuth } from "../../store/authStore";

interface DocumentProps {
	file?: string | { url: string; httpHeaders?: Record<string, string> };
	onLoadSuccess?: (pdf: { numPages: number }) => void;
	onLoadError?: (error: Error) => void;
	loading?: React.ReactNode;
	error?: React.ReactNode;
	children?: React.ReactNode;
}

interface PageProps {
	pageNumber: number;
	width?: number;
	renderTextLayer?: boolean;
	renderAnnotationLayer?: boolean;
}

interface PdfComponents {
	Document: ComponentType<DocumentProps>;
	Page: ComponentType<PageProps>;
}

const PdfViewerComponent = ({ url }: { url: string }) => {
	const [PdfComponent, setPdfComponent] = useState<PdfComponents | null>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [error, setError] = useState<string | null>(null);
	const [containerWidth, setContainerWidth] = useState<number>(0);
	const [scale, setScale] = useState<number>(1);

	const containerRef = useRef<HTMLDivElement>(null);
	const pagesWrapperRef = useRef<HTMLDivElement>(null);
	const isClientRef = useRef(false);

	const minScale = 1;
	const maxScale = 2;

	// Загрузка react-pdf только на клиенте
	useEffect(() => {
		if (typeof window === "undefined" || isClientRef.current) return;
		isClientRef.current = true;

		import("react-pdf")
			.then((pdfModule) => {
				const { Document, Page, pdfjs } = pdfModule;
				// Устанавливаем worker
				pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
				setPdfComponent({ Document, Page });
			})
			.catch((err) => {
				console.error("Failed to load PDF libraries:", err);
				setError("Не удалось загрузить библиотеку PDF");
			});
	}, []);

	// ResizeObserver для ширины контейнера
	useEffect(() => {
		if (!containerRef.current) return;

		setContainerWidth(containerRef.current.clientWidth || 0);
	}, [containerRef.current]);

	// Wheel zoom (Ctrl/Cmd + wheel) — window-level, passive:false, capture:true
	useEffect(() => {
		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				e.stopPropagation();
				const factor = Math.exp(-e.deltaY * 0.0015);
				setScale((prev) =>
					Math.max(minScale, Math.min(maxScale, prev * factor))
				);
			}
		};

		window.addEventListener("wheel", handleWheel, {
			passive: false,
			capture: true,
		});
		return () =>
			window.removeEventListener("wheel", handleWheel, {
				capture: true,
			} as AddEventListenerOptions);
	}, []);

	const resetZoom = useCallback(() => setScale(1), []);

	const handleDoubleClick = useCallback(() => resetZoom(), [resetZoom]);

	if (!isClientRef.current || !PdfComponent) return null;

	const { Document, Page } = PdfComponent;

	return (
		<div onDoubleClick={handleDoubleClick}>
			<Document
				file={url ? { url: `${import.meta.env.VITE_BASE_URL}${url}`, httpHeaders: {
					Authorization: `Bearer ${useAuth.getState().accessToken}`,
				} } : undefined}
				
				onLoadSuccess={({ numPages }: { numPages: number }) => {
					setNumPages(numPages);
					setError(null);
				}}
				
				onLoadError={(error: Error) => {
					console.error("PDF load error:", error);
					setError(error.message);
				}}
				loading={
					<div className="pt-6">
						<Spin />
					</div>
				}
				error={
					<div>
						Ошибка загрузки PDF: {error || "Неизвестная ошибка"}
					</div>
				}
			>
				<div
					ref={containerRef}
					className="w-full h-full border border-gray-300 rounded-2xl mt-6 overflow-auto"
				>
					<div
						style={{
							width:
								containerWidth > 0
									? containerWidth * scale - 24
									: undefined,
						}}
					>
						<div
							ref={pagesWrapperRef}
							style={{
								transform: `scale(${scale / 2})`,
								transformOrigin: "top left",
								width:
									containerWidth > 0
										? containerWidth
										: undefined,
								transition: "transform 0.15s ease-out",
							}}
						>
							{Array.from(
								new Array(numPages || 1),
								(_el, index) => (
									<Page
										key={`page_${index + 1}`}
										pageNumber={index + 1}
										width={
											containerWidth > 0
												? Math.max(
													0,
													containerWidth * 2 - 24
												)
												: undefined
										}
										renderTextLayer={true}
										renderAnnotationLayer={false}
									/>
								)
							)}
						</div>
					</div>
				</div>
			</Document>
		</div>
	);
};

export const PdfViewer = memo(PdfViewerComponent);

export default PdfViewer;
