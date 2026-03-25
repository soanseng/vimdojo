package epub

// Book represents the parsed structure of an EPUB book.
type Book struct {
	Title    string
	Author   string
	Language string
	Items    []SpineItem // in reading order
}

// SpineItem is a single XHTML document in the book's spine (reading order).
type SpineItem struct {
	ID       string
	Href     string
	Content  []byte // raw XHTML bytes
	Order    int
}
